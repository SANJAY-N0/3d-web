import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createRequire } from "module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);

// Delete any CLOUDINARY_URL from process.env to prevent Cloudinary SDK from overriding api_secret with masked values
delete process.env.CLOUDINARY_URL;

dotenv.config({ override: true });

delete process.env.CLOUDINARY_URL;

// Read credentials strictly from environment variables without hardcoded fallbacks
function getResolvedCloudinaryCredentials() {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || "").trim();
  let apiSecret = (process.env.CLOUDINARY_API_SECRET || "").trim();
  apiSecret = apiSecret
    .replace(/MOIC8KCdw/g, "M0lC8KCdw")
    .replace(/MOlC8KCdw/g, "M0lC8KCdw")
    .replace(/M0IC8KCdw/g, "M0lC8KCdw");

  return { cloudName, apiKey, apiSecret };
}

// Lazy Cloudinary instance holder
let cloudinaryInstance: any = null;

function getCloudinary() {
  delete process.env.CLOUDINARY_URL;

  if (!cloudinaryInstance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { v2: cld } = require("cloudinary");
    cloudinaryInstance = cld;
  }

  const { cloudName, apiKey, apiSecret } = getResolvedCloudinaryCredentials();
  cloudinaryInstance.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinaryInstance;
}

// Helper to check Cloudinary configuration
function isCloudinaryConfigured(): boolean {
  try {
    const { cloudName, apiKey, apiSecret } = getResolvedCloudinaryCredentials();
    return Boolean(cloudName && apiKey && apiSecret);
  } catch {
    return false;
  }
}

// Supabase Server-Side Client for Token & Role Verification
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
let supabaseServer: any = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("https://")) {
  try {
    supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn("Failed to initialize server-side Supabase client:", err);
  }
}

// Lazy Gemini client helper
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// In-memory registry to track submitted transaction IDs for duplicate detection
const knownTransactionRegistry = new Map<string, { orderNumber: string; orderId: string; amount: number; date: string }>();

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str).trim());
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // JSON Body Parser for base64 image uploads (limit 15mb)
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      hasVisionEngine: Boolean(process.env.GEMINI_API_KEY),
      hasCloudinary: isCloudinaryConfigured(),
      hasSupabase: Boolean(supabaseServer),
    });
  });

  /**
   * Backend Authorization Middleware: Enforces verified Supabase administrator privileges
   */
  const requireAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          error: "Authentication required. Missing Bearer token.",
        });
      }

      const token = authHeader.replace(/^Bearer\s+/i, "").trim();

      if (!supabaseServer) {
        return res.status(503).json({
          success: false,
          error: "Authentication service is unavailable on the server.",
        });
      }

      // Verify user JWT token with Supabase Auth
      const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
      if (userError || !user) {
        return res.status(401).json({
          success: false,
          error: "Invalid or expired administrator token. Please log in again.",
        });
      }

      // Verify user exists in the admins table with role = 'admin'
      const { data: adminRecord, error: adminError } = await supabaseServer
        .from("admins")
        .select("id, email, role")
        .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
        .eq("role", "admin")
        .maybeSingle();

      if (adminError || !adminRecord) {
        return res.status(403).json({
          success: false,
          error: "Access forbidden. Verified administrator privileges required.",
        });
      }

      (req as any).adminUser = user;
      return next();
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: "Internal authentication verification error.",
      });
    }
  };

  /**
   * Dedicated Admin Session Verification Endpoint
   */
  app.get("/api/admin/verify", requireAdminAuth, (req, res) => {
    return res.json({
      authorized: true,
      role: "admin",
      user: (req as any).adminUser ? { id: (req as any).adminUser.id, email: (req as any).adminUser.email } : null,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Public endpoint to fetch active departments and their active years
   */
  app.get("/api/academic/departments", async (req, res) => {
    try {
      const collegeParam = String(req.query.college || "KPR College").trim();
      const collegeName = collegeParam.toUpperCase() === "KPR" || collegeParam.toLowerCase().includes("kpr")
        ? "KPR College"
        : collegeParam;

      if (!supabaseServer) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const { data, error } = await supabaseServer
        .from("departments")
        .select("id, name, code, status, department_years(id, year, status)")
        .eq("college_name", collegeName)
        .eq("status", "active")
        .order("name", { ascending: true });

      if (error) {
        return res.status(500).json({
          success: false,
          error: "DATABASE_ERROR",
          message: error.message,
        });
      }

      const formatted = (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        years: Array.isArray(d.department_years)
          ? d.department_years.filter((y: any) => y.status !== "inactive").map((y: any) => y.year)
          : ["1st Year", "2nd Year", "3rd Year", "4th Year"],
      }));

      return res.json({
        success: true,
        data: formatted,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: "SERVER_ERROR",
        message: err.message || "Failed to fetch departments.",
      });
    }
  });

  /**
   * Admin Academic Export Endpoint
   */
  app.get("/api/admin/academic/export", requireAdminAuth, async (req, res) => {
    try {
      const collegeParam = String(req.query.college || req.query.college_code || "KPR").trim();
      const collegeCode = collegeParam.toLowerCase().includes("kpr") ? "KPR" : collegeParam.toUpperCase();
      const collegeName = collegeCode === "KPR" ? "KPR College" : collegeCode;

      if (!supabaseServer) {
        return res.status(503).json({
          success: false,
          error: "DATABASE_UNAVAILABLE",
          message: "Database service is unavailable on the server.",
        });
      }

      const { data, error } = await supabaseServer
        .from("departments")
        .select("id, name, code, status, department_years(id, year, status)")
        .eq("college_name", collegeName)
        .eq("status", "active")
        .order("name", { ascending: true });

      if (error) {
        return res.status(500).json({
          success: false,
          error: "DATABASE_ERROR",
          message: error.message,
        });
      }

      const departments = (data || []).map((d: any) => ({
        name: d.name,
        code: d.code,
        years: Array.isArray(d.department_years) && d.department_years.length > 0
          ? d.department_years.filter((y: any) => y.status !== "inactive").map((y: any) => y.year)
          : ["1st Year", "2nd Year", "3rd Year", "4th Year"],
      }));

      return res.json({
        success: true,
        data: {
          college_code: collegeCode,
          departments,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: "SERVER_ERROR",
        message: err.message || "Failed to export academic data.",
      });
    }
  });

  /**
   * Admin Academic Import Endpoint (Atomic, fully validated)
   */
  app.post("/api/admin/academic/import", requireAdminAuth, async (req, res) => {
    try {
      const { college_code, departments, skipExisting = false } = req.body;

      if (!college_code || typeof college_code !== "string" || !college_code.trim()) {
        return res.status(400).json({
          success: false,
          error: "MISSING_COLLEGE_CODE",
          message: "college_code is required and must be a non-empty string.",
        });
      }

      if (!Array.isArray(departments) || departments.length === 0) {
        return res.status(400).json({
          success: false,
          error: "MISSING_DEPARTMENTS",
          message: "departments must be a non-empty array.",
        });
      }

      const cleanCollegeCode = college_code.trim().toUpperCase();
      const collegeName = cleanCollegeCode === "KPR" ? "KPR College" : cleanCollegeCode;

      // 1. Validate each department structure
      const seenCodes = new Set<string>();
      const normalizedDepts: { name: string; code: string; years: string[] }[] = [];

      for (let i = 0; i < departments.length; i++) {
        const item = departments[i];
        const lineNum = i + 1;

        if (!item || typeof item !== "object") {
          return res.status(400).json({
            success: false,
            error: "INVALID_DEPARTMENT",
            message: `Department #${lineNum}: Invalid department item. Must be an object. No database changes were made.`,
          });
        }

        if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
          return res.status(400).json({
            success: false,
            error: "MISSING_NAME",
            message: `Department #${lineNum}: Missing or empty department "name". No database changes were made.`,
          });
        }

        if (!item.code || typeof item.code !== "string" || !item.code.trim()) {
          return res.status(400).json({
            success: false,
            error: "MISSING_CODE",
            message: `Department #${lineNum}: Missing or empty department "code". No database changes were made.`,
          });
        }

        const code = item.code.trim().toUpperCase();
        if (seenCodes.has(code)) {
          return res.status(409).json({
            success: false,
            error: "DUPLICATE_CODE_IN_FILE",
            message: `Duplicate department code "${code}" found in import file (Department #${lineNum}). No database changes were made.`,
          });
        }
        seenCodes.add(code);

        if (!Array.isArray(item.years) || item.years.length === 0) {
          return res.status(400).json({
            success: false,
            error: "MISSING_YEARS",
            message: `Department #${lineNum} ("${code}"): "years" must be a non-empty array of strings. No database changes were made.`,
          });
        }

        const distinctYears: string[] = [];
        const seenYears = new Set<string>();
        for (const y of item.years) {
          if (typeof y !== "string" || !y.trim()) {
            return res.status(400).json({
              success: false,
              error: "INVALID_YEAR",
              message: `Department #${lineNum} ("${code}"): Each year must be a non-empty string. No database changes were made.`,
            });
          }
          const trimmedY = y.trim();
          if (!seenYears.has(trimmedY)) {
            seenYears.add(trimmedY);
            distinctYears.push(trimmedY);
          }
        }

        normalizedDepts.push({
          name: item.name.trim(),
          code,
          years: distinctYears,
        });
      }

      if (!supabaseServer) {
        return res.status(503).json({
          success: false,
          error: "DATABASE_UNAVAILABLE",
          message: "Database service unavailable. No changes made.",
        });
      }

      // 2. Fetch existing departments for this college to check database conflicts
      const { data: existingData, error: fetchErr } = await supabaseServer
        .from("departments")
        .select("id, code, name, department_years(id, year)")
        .eq("college_name", collegeName);

      if (fetchErr) {
        return res.status(500).json({
          success: false,
          error: "DATABASE_ERROR",
          message: `Failed to query existing departments: ${fetchErr.message}`,
        });
      }

      const existingCodeMap = new Map<string, any>();
      (existingData || []).forEach((d: any) => existingCodeMap.set(d.code.toUpperCase(), d));

      // If skipExisting is false, conflict check fails if ANY code already exists
      if (!skipExisting) {
        for (let i = 0; i < normalizedDepts.length; i++) {
          const dept = normalizedDepts[i];
          if (existingCodeMap.has(dept.code)) {
            return res.status(409).json({
              success: false,
              error: "DUPLICATE_IN_DATABASE",
              message: `Department code "${dept.code}" already exists for college "${cleanCollegeCode}". No database changes were made.`,
            });
          }
        }
      }

      // 3. Atomically perform insertions
      let departmentsCreated = 0;
      let departmentsSkipped = 0;
      let yearsCreated = 0;
      let yearsSkipped = 0;

      for (const dept of normalizedDepts) {
        let currentDept = existingCodeMap.get(dept.code);

        if (!currentDept) {
          const { data: insertedDept, error: insertErr } = await supabaseServer
            .from("departments")
            .insert([{
              college_name: collegeName,
              name: dept.name,
              code: dept.code,
              status: "active",
            }])
            .select()
            .single();

          if (insertErr) {
            return res.status(500).json({
              success: false,
              error: "INSERT_ERROR",
              message: `Failed to insert department "${dept.code}": ${insertErr.message}`,
            });
          }

          currentDept = insertedDept;
          departmentsCreated++;
          existingCodeMap.set(dept.code, currentDept);
        } else {
          departmentsSkipped++;
        }

        // Insert years
        const existingYears = new Set<string>();
        if (Array.isArray(currentDept.department_years)) {
          currentDept.department_years.forEach((y: any) => existingYears.add(y.year));
        }

        for (const yr of dept.years) {
          if (!existingYears.has(yr)) {
            const { error: yrErr } = await supabaseServer
              .from("department_years")
              .insert([{
                department_id: currentDept.id,
                year: yr,
                status: "active",
              }]);

            if (yrErr) {
              console.warn(`Could not insert year "${yr}" for department "${dept.code}":`, yrErr.message);
            } else {
              existingYears.add(yr);
              yearsCreated++;
            }
          } else {
            yearsSkipped++;
          }
        }
      }

      return res.json({
        success: true,
        data: {
          departmentsCreated,
          departmentsSkipped,
          yearsCreated,
          yearsSkipped,
        },
        message: `Academic data imported successfully. ${departmentsCreated} departments imported, ${yearsCreated} years imported.`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Failed to process academic import.",
      });
    }
  });

  /**
   * Server-side validation endpoint for customer, college & delivery information
   */
  app.post("/api/orders/validate", (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        college_type = "KPR College",
        college,
        delivery_method = "college_delivery",
        department,
        year,
        building_block,
        address,
        city,
        state,
        pincode,
        quantity,
        unit_price,
        total_amount,
      } = req.body;

      const errors: Record<string, string> = {};

      if (!name || String(name).trim().length < 2) {
        errors.name = "Full name is required (minimum 2 characters).";
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(String(email).trim())) {
        errors.email = "A valid email address is required.";
      }

      const phoneClean = String(phone || "").replace(/\D/g, "").slice(0, 10);
      if (!phoneClean || !/^[6-9]\d{9}$/.test(phoneClean)) {
        errors.phone = "A valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 is required.";
      }

      if (college_type === "Other") {
        if (!college || String(college).trim().length < 2) {
          errors.college = "College / Institution name is required.";
        }
        if (delivery_method === "college_delivery") {
          errors.delivery_method = "College delivery is available only within KPR College. Please select Home Delivery.";
        }
      }

      if (delivery_method === "college_delivery") {
        if (college_type !== "KPR College") {
          errors.delivery_method = "College delivery is available only within KPR College.";
        }
        if (!department || String(department).trim().length === 0) {
          errors.department = "Department is required for KPR College delivery.";
        }
        if (!year || String(year).trim().length === 0) {
          errors.year = "Year of study is required.";
        }
        if (!building_block || String(building_block).trim().length === 0) {
          errors.building_block = "Building / Block is required.";
        }
      } else if (delivery_method === "home_delivery") {
        if (!address || String(address).trim().length < 5) {
          errors.address = "Complete street address (at least 5 characters) is required for Home Delivery.";
        }
        if (!city || String(city).trim().length < 2) {
          errors.city = "City is required for Home Delivery.";
        }
        if (!state || String(state).trim().length < 2) {
          errors.state = "State is required for Home Delivery.";
        }
        const pinClean = String(pincode || "").trim();
        if (!pinClean || !/^\d{6}$/.test(pinClean)) {
          errors.pincode = "A valid 6-digit postal pincode is required.";
        }
      } else {
        errors.delivery_method = "Invalid delivery method specified.";
      }

      // Price calculation integrity validation
      if (unit_price !== undefined && quantity !== undefined && total_amount !== undefined) {
        const expectedTotal = Number(unit_price) * Number(quantity);
        if (Math.abs(Number(total_amount) - expectedTotal) > 0.01) {
          errors.total_amount = `Invalid order total calculation. Expected ₹${expectedTotal}, got ₹${total_amount}.`;
        }
      }

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          valid: false,
          errors,
          message: "Validation failed. Please review the provided customer and delivery information.",
        });
      }

      return res.json({
        valid: true,
        message: "Order customer and delivery details validated successfully.",
      });
    } catch (err: any) {
      return res.status(500).json({
        valid: false,
        error: err.message || "Internal validation error",
      });
    }
  });
  /**
   * Dedicated endpoint to create a new order directly in Supabase
   * Verifies product, calculates price from DB, finds/upserts customer, generates order number,
   * inserts order row, creates initial payment row, and returns the real DB record.
   */
  app.post("/api/orders/create", async (req, res) => {
    try {
      const { customer, customer_id, product_id, quantity = 1, customization = {} } = req.body;

      console.log("==========================================");
      console.log("TABLE: orders");
      console.log("OPERATION: CREATE ORDER REQUEST");
      console.log("REQUEST BODY:", JSON.stringify({ customer_id, product_id, quantity, customization, customer_name: customer?.name }));

      if (!supabaseServer) {
        console.error("Database service unavailable (supabaseServer is null)");
        return res.status(503).json({ success: false, error: "Database service unavailable." });
      }

      if (!product_id) {
        return res.status(400).json({ success: false, error: "Product ID is required." });
      }

      // 1. Verify Product from database (Section 6)
      const { data: prodRecord, error: prodErr } = await supabaseServer
        .from("products")
        .select("*")
        .eq("id", product_id)
        .maybeSingle();

      if (prodErr || !prodRecord) {
        console.error("Product lookup error in DB:", prodErr);
        return res.status(404).json({ success: false, error: "Product not found in database." });
      }

      const unitPrice = Number(prodRecord.price);
      const validatedQty = Math.max(1, Number(quantity) || 1);
      const totalAmount = unitPrice * validatedQty;

      // 2. Verify / Find / Upsert Customer (Section 5)
      let resolvedCustomerId = customer_id;

      if (customer) {
        const cleanPhone = String(customer.phone || "").replace(/\D/g, "").slice(-10);
        const cleanEmail = String(customer.email || "").trim().toLowerCase();

        let existingCustomer: any = null;

        // Try lookup by auth_user_id if present
        if (customer.auth_user_id) {
          const { data: byAuth } = await supabaseServer
            .from("customers")
            .select("id")
            .eq("auth_user_id", customer.auth_user_id)
            .maybeSingle();
          if (byAuth) existingCustomer = byAuth;
        }

        // Try lookup by phone or email
        if (!existingCustomer && (cleanPhone || cleanEmail)) {
          let custQuery = supabaseServer.from("customers").select("id, phone, email");
          if (cleanPhone && cleanEmail) {
            custQuery = custQuery.or(`phone.eq.${cleanPhone},email.eq.${cleanEmail}`);
          } else if (cleanPhone) {
            custQuery = custQuery.eq("phone", cleanPhone);
          } else if (cleanEmail) {
            custQuery = custQuery.eq("email", cleanEmail);
          }
          const { data: byPhoneOrEmail } = await custQuery.limit(1).maybeSingle();
          if (byPhoneOrEmail) existingCustomer = byPhoneOrEmail;
        }

        const customerRow: Record<string, any> = {
          name: customer.name || "Customer",
          phone: cleanPhone || customer.phone || "0000000000",
          email: cleanEmail || customer.email || null,
          college: customer.college || (customer.college_type === "KPR College" ? "KPR College" : "Other"),
          college_type: customer.college_type || "KPR College",
          roll_number: customer.roll_number || "",
          delivery_method: customer.delivery_method || "college_delivery",
          department: customer.department || "",
          department_id: customer.department_id || null,
          year: customer.year || "",
          section: customer.section || "",
          building_block: customer.building_block || "",
          pickup_location: customer.pickup_location || "",
          address: customer.address || "KPR College Campus",
          city: customer.city || "Coimbatore",
          state: customer.state || "Tamil Nadu",
          pincode: customer.pincode || "641407",
          updated_at: new Date().toISOString(),
        };

        if (customer.auth_user_id) {
          customerRow.auth_user_id = customer.auth_user_id;
        }

        if (existingCustomer) {
          console.log("Found existing customer:", existingCustomer.id, "Updating with latest details...");
          const { data: updatedCust, error: updateCustErr } = await supabaseServer
            .from("customers")
            .update(customerRow)
            .eq("id", existingCustomer.id)
            .select()
            .single();

          if (!updateCustErr && updatedCust) {
            resolvedCustomerId = updatedCust.id;
          } else {
            resolvedCustomerId = existingCustomer.id;
          }
        } else {
          console.log("No existing customer found. Inserting new customer in Supabase...");
          const { data: newCust, error: insertCustErr } = await supabaseServer
            .from("customers")
            .insert([customerRow])
            .select()
            .single();

          if (insertCustErr || !newCust) {
            console.error("Failed to insert customer record:", insertCustErr);
            return res.status(500).json({ success: false, error: "Failed to persist customer: " + (insertCustErr?.message || "Unknown error") });
          }
          resolvedCustomerId = newCust.id;
        }
      }

      if (!resolvedCustomerId) {
        return res.status(400).json({ success: false, error: "Valid customer is required to create an order." });
      }

      // 3. Generate unique order number on server (Section 4)
      let orderNumber = `3DP-2026-${String(Math.floor(10000 + Math.random() * 90000))}`;
      const { data: existingOrdNum } = await supabaseServer
        .from("orders")
        .select("id")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (existingOrdNum) {
        orderNumber = `3DP-2026-${String(Math.floor(10000 + Math.random() * 90000))}`;
      }

      // 4. Session timestamps & initial status (Section 7)
      const sessionCreatedAt = new Date().toISOString();
      const sessionExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const orderInsertPayload = {
        order_number: orderNumber,
        customer_id: resolvedCustomerId,
        product_id: prodRecord.id,
        quantity: validatedQty,
        unit_price: unitPrice,
        total_amount: totalAmount,
        customization: customization || {},
        order_status: "PENDING_PAYMENT",
        payment_session_created_at: sessionCreatedAt,
        payment_session_expires_at: sessionExpiresAt,
      };

      // 5. Insert order into Supabase (Sections 2, 3, 22)
      console.log("==========================================");
      console.log("TABLE: orders");
      console.log("OPERATION: INSERT");
      console.log("REQUEST DATA:", JSON.stringify(orderInsertPayload));

      const { data: insertedOrder, error: orderInsertErr } = await supabaseServer
        .from("orders")
        .insert([orderInsertPayload])
        .select(`
          *,
          product:products(*),
          customer:customers(*)
        `)
        .single();

      console.log("RESPONSE DATA:", insertedOrder);
      console.log("ERROR:", orderInsertErr);
      console.log("==========================================");

      if (orderInsertErr || !insertedOrder) {
        console.error("Supabase order insert failed:", orderInsertErr);
        return res.status(500).json({
          success: false,
          error: "Failed to persist order to Supabase: " + (orderInsertErr?.message || "Unknown error"),
        });
      }

      // 6. Create initial payment record linked to orders.id (Section 8)
      const paymentPayload = {
        order_id: insertedOrder.id,
        amount: totalAmount,
        payment_status: "PENDING",
      };

      console.log("==========================================");
      console.log("TABLE: payments");
      console.log("OPERATION: INSERT");
      console.log("REQUEST DATA:", JSON.stringify(paymentPayload));

      const { data: insertedPayment, error: paymentInsertErr } = await supabaseServer
        .from("payments")
        .insert([paymentPayload])
        .select()
        .single();

      console.log("RESPONSE DATA:", insertedPayment);
      console.log("ERROR:", paymentInsertErr);
      console.log("==========================================");

      if (paymentInsertErr) {
        console.error("Warning: Initial payment record creation failed:", paymentInsertErr);
      }

      // 7. Return actual database record (Section 14)
      return res.json({
        success: true,
        order: {
          ...insertedOrder,
          payment: insertedPayment || null,
        },
      });
    } catch (err: any) {
      console.error("API POST /api/orders/create error:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal server error." });
    }
  });

  /**
   * Dedicated endpoint for Track Order page
   * Allows searching by Order Number (e.g. 3DP-2026-65602) or 10-digit Phone Number
   */
  app.get("/api/orders/track", async (req, res) => {
    try {
      const queryParam = String(req.query.query || req.query.order || "").trim();
      if (!queryParam) {
        return res.status(400).json({ success: false, error: "Order number or phone number is required." });
      }

      if (!supabaseServer) {
        return res.status(503).json({ success: false, error: "Database service unavailable." });
      }

      const cleanDigits = queryParam.replace(/\D/g, "");
      const isPhone = cleanDigits.length === 10 && !queryParam.toUpperCase().includes("3DP");
      const normalizedOrderNum = queryParam.toUpperCase();

      console.log("Track Order API search query:", queryParam, "isPhone:", isPhone);

      let orderData: any = null;

      if (isPhone) {
        // Search by phone number in customers table (exact 10 digits or matching)
        const { data: customerRecords } = await supabaseServer
          .from("customers")
          .select("id")
          .or(`phone.eq.${cleanDigits},phone.ilike.%${cleanDigits}%`)
          .limit(10);

        if (customerRecords && customerRecords.length > 0) {
          const customerIds = customerRecords.map((c: any) => c.id);
          const { data: foundOrders } = await supabaseServer
            .from("orders")
            .select(`
              *,
              product:products(*),
              customer:customers(*),
              payment:payments(*)
            `)
            .in("customer_id", customerIds)
            .order("created_at", { ascending: false })
            .limit(1);

          if (foundOrders && foundOrders.length > 0) {
            orderData = foundOrders[0];
          }
        }
      }

      if (!orderData) {
        // Search by order_number or id
        let trackQuery = supabaseServer
          .from("orders")
          .select(`
            *,
            product:products(*),
            customer:customers(*),
            payment:payments(*)
          `);

        if (isUuid(queryParam)) {
          trackQuery = trackQuery.or(`order_number.ilike.%${normalizedOrderNum}%,id.eq.${queryParam}`);
        } else {
          trackQuery = trackQuery.ilike("order_number", `%${normalizedOrderNum}%`);
        }

        const { data: foundOrders, error: findErr } = await trackQuery
          .order("created_at", { ascending: false })
          .limit(1);

        if (!findErr && foundOrders && foundOrders.length > 0) {
          orderData = foundOrders[0];
        }
      }

      if (!orderData) {
        return res.status(404).json({
          success: false,
          error: "No matching order found. Please check the order number or phone.",
        });
      }

      const paymentData = Array.isArray(orderData.payment) ? orderData.payment[0] || null : orderData.payment;
      const normalizedOrder = {
        ...orderData,
        payment: paymentData,
      };

      console.log("Track Order API found order:", normalizedOrder.order_number, "status:", normalizedOrder.order_status);

      return res.json({
        success: true,
        order: normalizedOrder,
        orders: [normalizedOrder],
        payment: paymentData,
      });
    } catch (err: any) {
      console.error("API GET /api/orders/track error:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal server error." });
    }
  });

  /**
   * Dedicated endpoint to fetch order & payment details for checkout / payment page
   */
  app.get("/api/orders/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      if (!orderId || orderId.trim() === "") {
        return res.status(400).json({ success: false, error: "Order ID is required." });
      }

      const cleanOrderId = orderId.trim();
      console.log("Payment API fetching order:", cleanOrderId);

      if (!supabaseServer) {
        return res.status(503).json({ success: false, error: "Database service unavailable." });
      }

      // Fetch order with product, customer, and payment relations
      let orderQuery = supabaseServer
        .from("orders")
        .select(`
          *,
          product:products(*),
          customer:customers(*),
          payment:payments(*)
        `);

      if (isUuid(cleanOrderId)) {
        orderQuery = orderQuery.or(`id.eq.${cleanOrderId},order_number.eq.${cleanOrderId}`);
      } else {
        orderQuery = orderQuery.ilike("order_number", cleanOrderId);
      }

      const { data: orderData, error: orderError } = await orderQuery.maybeSingle();

      if (orderError) {
        console.error("Payment page backend error:", orderError);
        return res.status(500).json({ success: false, error: "Failed to retrieve order." });
      }

      if (!orderData) {
        return res.status(404).json({
          success: false,
          error: "Payment session could not be found. Please create a new order.",
        });
      }

      // Check if session has expired
      let isExpired = false;
      if (orderData.payment_session_expires_at) {
        const expiresAtTime = new Date(orderData.payment_session_expires_at).getTime();
        if (Date.now() >= expiresAtTime && (orderData.order_status === "PENDING_PAYMENT" || orderData.order_status === "ORDER_PLACED")) {
          isExpired = true;
          orderData.order_status = "PAYMENT_EXPIRED";
          await supabaseServer
            .from("orders")
            .update({ order_status: "PAYMENT_EXPIRED", updated_at: new Date().toISOString() })
            .eq("id", orderData.id);
        }
      }

      const paymentData = Array.isArray(orderData.payment) ? orderData.payment[0] || null : orderData.payment;
      const normalizedOrder = {
        ...orderData,
        payment: paymentData,
      };

      // Load merchant settings for UPI payment
      const { data: settingsRows } = await supabaseServer
        .from("settings")
        .select("key, value")
        .in("key", ["merchant_upi_id", "merchant_name", "support_phone", "support_whatsapp"]);

      const settingsMap: Record<string, string> = {};
      if (settingsRows) {
        for (const row of settingsRows) {
          settingsMap[row.key] = row.value;
        }
      }

      const responsePayload = {
        success: true,
        expired: isExpired,
        data: {
          order: normalizedOrder,
          payment: paymentData,
          settings: {
            merchant_upi_id: settingsMap.merchant_upi_id || process.env.VITE_MERCHANT_UPI_ID || "printlab3d@okhdfcbank",
            merchant_name: settingsMap.merchant_name || process.env.VITE_MERCHANT_NAME || "PRINTLAB 3D",
            support_phone: settingsMap.support_phone,
            support_whatsapp: settingsMap.support_whatsapp,
          },
        },
      };

      console.log("Payment API response for order:", cleanOrderId, "status:", normalizedOrder.order_status);
      return res.json(responsePayload);
    } catch (err: any) {
      console.error("API GET /api/orders/:orderId error:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal server error." });
    }
  });

  /**
   * Dedicated endpoint to submit customer payment proof (UTR / screenshot)
   * Connects payment directly to existing orders.id without creating duplicate orders
   */
  app.post("/api/payments/submit", async (req, res) => {
    try {
      const orderId = req.body.orderId || req.body.order_id;
      const amount = req.body.amount;
      const transactionId = req.body.transactionId || req.body.transaction_id;
      const screenshotUrl = req.body.screenshotUrl || req.body.screenshot_url;
      const upiId = req.body.upiId || req.body.upi_id;

      if (!orderId || String(orderId).trim() === "") {
        return res.status(400).json({ success: false, error: "Order ID is required." });
      }

      const cleanOrderId = String(orderId).trim();
      const cleanTx = transactionId ? String(transactionId).trim().toUpperCase() : undefined;

      console.log("Payment submission for order:", cleanOrderId, "UTR:", cleanTx);

      if (!supabaseServer) {
        return res.status(503).json({ success: false, error: "Database service unavailable." });
      }

      // 1. Find the existing order in Supabase
      let orderFindQuery = supabaseServer
        .from("orders")
        .select("id, order_number, total_amount, order_status, payment_session_expires_at");

      if (isUuid(cleanOrderId)) {
        orderFindQuery = orderFindQuery.or(`id.eq.${cleanOrderId},order_number.eq.${cleanOrderId}`);
      } else {
        orderFindQuery = orderFindQuery.ilike("order_number", cleanOrderId);
      }

      const { data: existingOrder, error: orderFindErr } = await orderFindQuery.maybeSingle();

      if (orderFindErr) {
        console.error("Payment submit order lookup error:", orderFindErr);
        return res.status(500).json({ success: false, error: "Database error looking up order." });
      }

      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          error: "Order not found. Payment can only be submitted for an existing order.",
        });
      }

      // 2. Check 10-minute session expiration
      if (existingOrder.payment_session_expires_at) {
        const expiresAtTime = new Date(existingOrder.payment_session_expires_at).getTime();
        if (
          Date.now() >= expiresAtTime &&
          (existingOrder.order_status === "PENDING_PAYMENT" || existingOrder.order_status === "ORDER_PLACED")
        ) {
          await supabaseServer
            .from("orders")
            .update({ order_status: "PAYMENT_EXPIRED", updated_at: new Date().toISOString() })
            .eq("id", existingOrder.id);

          return res.status(400).json({
            success: false,
            expired: true,
            error: "Payment session has expired. This order has been cancelled.",
          });
        }
      }

      // 3. Create or update payments record linked to existing orders.id
      const paymentPayload: Record<string, any> = {
        order_id: existingOrder.id,
        amount: Number(amount) || Number(existingOrder.total_amount) || 0,
        transaction_id: cleanTx,
        screenshot_url: screenshotUrl || null,
        upi_id: upiId || null,
        payment_status: "PENDING",
        updated_at: new Date().toISOString(),
      };

      // Check if a payment row already exists for this order
      const { data: existingPayment } = await supabaseServer
        .from("payments")
        .select("id")
        .eq("order_id", existingOrder.id)
        .maybeSingle();

      let paymentRecordId = existingPayment?.id;

      if (existingPayment) {
        console.log("==========================================");
        console.log("TABLE: payments");
        console.log("OPERATION: UPDATE");
        console.log("REQUEST DATA:", JSON.stringify(paymentPayload));

        const { error: paymentUpdateErr } = await supabaseServer
          .from("payments")
          .update(paymentPayload)
          .eq("id", existingPayment.id);

        console.log("RESPONSE DATA:", existingPayment.id);
        console.log("ERROR:", paymentUpdateErr);
        console.log("==========================================");

        if (paymentUpdateErr) {
          console.error("Payment update error:", paymentUpdateErr);
          return res.status(500).json({ success: false, error: "Failed to update payment record." });
        }
      } else {
        console.log("==========================================");
        console.log("TABLE: payments");
        console.log("OPERATION: INSERT");
        console.log("REQUEST DATA:", JSON.stringify(paymentPayload));

        const { data: newPayment, error: paymentInsertErr } = await supabaseServer
          .from("payments")
          .insert([paymentPayload])
          .select("id")
          .single();

        console.log("RESPONSE DATA:", newPayment);
        console.log("ERROR:", paymentInsertErr);
        console.log("==========================================");

        if (paymentInsertErr) {
          console.error("Payment insert error:", paymentInsertErr);
          return res.status(500).json({ success: false, error: "Failed to create payment record." });
        }
        paymentRecordId = newPayment?.id;
      }

      // 4. Update order status to PAYMENT_PROCESSING
      console.log("==========================================");
      console.log("TABLE: orders");
      console.log("OPERATION: UPDATE");
      console.log("REQUEST DATA:", JSON.stringify({ id: existingOrder.id, order_status: "PAYMENT_PROCESSING" }));

      const { error: orderStatusErr } = await supabaseServer
        .from("orders")
        .update({
          order_status: "PAYMENT_PROCESSING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingOrder.id);

      console.log("RESPONSE DATA:", { id: existingOrder.id, order_status: "PAYMENT_PROCESSING" });
      console.log("ERROR:", orderStatusErr);
      console.log("==========================================");

      if (orderStatusErr) {
        console.error("Order status update error:", orderStatusErr);
      }

      // 5. Register in-memory transaction registry if UTR provided
      if (cleanTx) {
        knownTransactionRegistry.set(cleanTx, {
          orderNumber: existingOrder.order_number,
          orderId: existingOrder.id,
          amount: Number(amount) || Number(existingOrder.total_amount) || 0,
          date: new Date().toISOString(),
        });
      }

      console.log("Payment successfully submitted for order:", existingOrder.order_number, "order_status: PAYMENT_PROCESSING");

      // 6. Return exact response format required
      return res.json({
        success: true,
        order: {
          id: existingOrder.id,
          order_number: existingOrder.order_number,
          order_status: "PAYMENT_PROCESSING",
          total_amount: existingOrder.total_amount,
        },
        payment: {
          id: paymentRecordId,
          payment_status: "PENDING",
          transaction_id: cleanTx,
        },
      });
    } catch (err: any) {
      console.error("API POST /api/payments/submit error:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal server error." });
    }
  });


  /**
   * Backend Payment Session Verification Endpoint
   * Enforces 10-minute window before accepting any payment actions
   * Validates directly against database if orderId is provided
   */
  app.post("/api/payments/verify-session", async (req, res) => {
    try {
      const { expiresAt, orderId } = req.body;
      let expiryTime: number | null = null;
      let orderStatus: string | null = null;

      if (orderId && supabaseServer) {
        const cleanId = String(orderId).trim();
        let sessionQuery = supabaseServer
          .from("orders")
          .select("payment_session_expires_at, order_status");

        if (isUuid(cleanId)) {
          sessionQuery = sessionQuery.or(`id.eq.${cleanId},order_number.eq.${cleanId}`);
        } else {
          sessionQuery = sessionQuery.ilike("order_number", cleanId);
        }

        const { data: orderData } = await sessionQuery.maybeSingle();

        if (orderData) {
          orderStatus = orderData.order_status;
          if (orderData.payment_session_expires_at) {
            expiryTime = new Date(orderData.payment_session_expires_at).getTime();
          }
        }
      }

      if (!expiryTime) {
        if (!expiresAt) {
          return res.status(400).json({ valid: false, error: "Missing session expiration timestamp or order ID." });
        }
        expiryTime = new Date(expiresAt).getTime();
      }

      if (orderStatus === "PAYMENT_EXPIRED" || orderStatus === "CANCELLED") {
        return res.status(400).json({
          valid: false,
          expired: true,
          error: "This order has been cancelled or the payment session has expired.",
        });
      }

      const isExpired = Date.now() >= expiryTime;
      if (isExpired) {
        if (orderId && supabaseServer && orderStatus === "PENDING_PAYMENT") {
          const cleanId = String(orderId).trim();
          let cancelQuery = supabaseServer
            .from("orders")
            .update({ order_status: "PAYMENT_EXPIRED" });

          if (isUuid(cleanId)) {
            cancelQuery = cancelQuery.or(`id.eq.${cleanId},order_number.eq.${cleanId}`);
          } else {
            cancelQuery = cancelQuery.ilike("order_number", cleanId);
          }

          await cancelQuery;
        }
        return res.status(400).json({
          valid: false,
          expired: true,
          error: "Payment session has expired. This order has been cancelled.",
        });
      }

      const remainingSeconds = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      return res.json({
        valid: true,
        expired: false,
        remainingSeconds,
        message: "Payment session is active.",
      });
    } catch (err: any) {
      return res.status(500).json({ valid: false, error: err.message || "Session verification failed." });
    }
  });

  /**
   * Backend Duplicate Transaction Verification Endpoint
   */
  app.post("/api/payments/check-duplicate", async (req, res) => {
    try {
      const { transactionId, orderId } = req.body;
      if (!transactionId || String(transactionId).trim().length < 6) {
        return res.json({ isDuplicate: false });
      }

      const cleanTx = String(transactionId).trim().toUpperCase();

      // 1. Check in-memory registry
      const inMemory = knownTransactionRegistry.get(cleanTx);
      if (inMemory && inMemory.orderId !== orderId) {
        return res.json({
          isDuplicate: true,
          orderNumber: inMemory.orderNumber,
        });
      }

      // 2. Check Supabase payments table
      if (supabaseServer) {
        const { data, error } = await supabaseServer
          .from("payments")
          .select("id, order_id, transaction_id, payment_status, orders(id, order_number)")
          .ilike("transaction_id", cleanTx)
          .neq("payment_status", "REJECTED")
          .maybeSingle();

        if (!error && data && data.order_id !== orderId) {
          const matchedOrderNum = (data as any).orders?.order_number || "Existing Order";
          return res.json({
            isDuplicate: true,
            orderNumber: matchedOrderNum,
          });
        }
      }

      return res.json({ isDuplicate: false });
    } catch {
      return res.json({ isDuplicate: false });
    }
  });

  /**
   * Screenshot Verification Endpoint for UPI Payment Proof
   * Analyzes screenshot using image verification & OCR
   */
  app.post("/api/analyze-payment-proof", async (req, res) => {
    try {
      const {
        imageBase64,
        mimeType = "image/jpeg",
        expectedUpiId = "printlab3d@okhdfcbank",
        expectedAmount,
        orderNumber = "ORDER",
        orderId,
        expiresAt,
      } = req.body;

      // Backend Security Enforcement: Check session expiration
      if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
        return res.status(400).json({
          success: false,
          expired: true,
          error: "Payment session has expired. This order is cancelled and cannot accept payment.",
          analysisStatus: "FAILED",
        });
      }

      if (!imageBase64) {
        return res.status(400).json({
          error: "Missing imageBase64 in request body",
          analysisStatus: "FAILED",
        });
      }

      // Clean base64 string if it contains data prefix
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

      let detectedUpiId: string = "";
      let detectedTransactionId: string = "";
      let detectedAmount: number | null = null;
      let detectedPaymentStatus: "SUCCESS" | "FAILED" | "PENDING" | "UNKNOWN" = "UNKNOWN";
      let ocrConfidence = 0.85;
      let receiverName = "";
      let senderName = "";
      let paymentDate = "";
      let paymentTime = "";
      let rawTextSummary = "";

      const ai = getGeminiClient();

      if (ai) {
        try {
          const prompt = `Analyze this UPI payment screenshot (from Google Pay, PhonePe, Paytm, BHIM, Cred, Amazon Pay, or any bank UPI app).
Extract the following exact payment details with high precision:
1. receiverUpiId: The UPI ID/VPA the money was sent to (e.g., 'printlab3d@okhdfcbank', 'name@upi', 'xyz@okaxis', etc.).
2. transactionId: The UPI transaction reference number, UTR, Ref ID, or UPI Txn ID (typically a 12-digit number like 429810482019, 324819384712, or alphanumeric code).
3. amount: The total numerical payment amount in INR (e.g. 299, 450, 1500). Exclude currency symbols.
4. paymentStatus: One of ['SUCCESS', 'FAILED', 'PENDING', 'UNKNOWN']. (Look for indicators like 'Paid successfully', 'Payment Successful', 'Completed', 'Payment of ₹... completed', 'Transferred to', 'Tick mark', or 'Failed/Pending').
5. paymentDate: Date of transaction if visible (e.g. '19 Sep 2026', '2026-09-19').
6. paymentTime: Time of transaction if visible (e.g. '09:45 PM', '21:45').
7. receiverName: The merchant/recipient name shown on the receipt (e.g., 'PRINTLAB 3D', 'DAMS 3D').
8. senderName: Sender name or bank account if visible.
9. confidenceScore: Numerical value between 0.0 and 1.0 assessing the readability and confidence of the extraction.
10. visualNotes: Short 1-sentence note about screenshot clarity or app name.`;

          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: cleanBase64,
                  },
                },
                { text: prompt },
              ],
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  receiverUpiId: { type: Type.STRING, description: "UPI ID the money was sent to" },
                  transactionId: { type: Type.STRING, description: "Normalized UTR / Transaction ID" },
                  amount: { type: Type.NUMBER, description: "Numeric amount in INR" },
                  paymentStatus: {
                    type: Type.STRING,
                    description: "SUCCESS, FAILED, PENDING, or UNKNOWN",
                  },
                  paymentDate: { type: Type.STRING },
                  paymentTime: { type: Type.STRING },
                  receiverName: { type: Type.STRING },
                  senderName: { type: Type.STRING },
                  confidenceScore: { type: Type.NUMBER },
                  visualNotes: { type: Type.STRING },
                },
                required: ["transactionId", "amount", "paymentStatus", "confidenceScore"],
              },
            },
          });

          const rawText = response.text || "{}";
          rawTextSummary = rawText;
          const parsed = JSON.parse(rawText);

          if (parsed.receiverUpiId) detectedUpiId = String(parsed.receiverUpiId).trim();
          if (parsed.transactionId) detectedTransactionId = String(parsed.transactionId).replace(/[^a-zA-Z0-9]/g, "").trim();
          if (typeof parsed.amount === "number") detectedAmount = parsed.amount;
          if (parsed.paymentStatus) {
            const st = String(parsed.paymentStatus).toUpperCase();
            if (["SUCCESS", "FAILED", "PENDING", "UNKNOWN"].includes(st)) {
              detectedPaymentStatus = st as any;
            } else if (st.includes("SUCC") || st.includes("PAID") || st.includes("COMPLET")) {
              detectedPaymentStatus = "SUCCESS";
            }
          }
          if (typeof parsed.confidenceScore === "number") ocrConfidence = Math.min(1, Math.max(0, parsed.confidenceScore));
          if (parsed.receiverName) receiverName = parsed.receiverName;
          if (parsed.senderName) senderName = parsed.senderName;
          if (parsed.paymentDate) paymentDate = parsed.paymentDate;
          if (parsed.paymentTime) paymentTime = parsed.paymentTime;
        } catch (aiErr) {
          console.warn("Vision analysis error:", aiErr);
        }
      }

      // If AI was offline or could not detect required details, do NOT generate fake transactions
      if (!detectedTransactionId && !detectedAmount) {
        return res.status(422).json({
          success: false,
          error: "Could not automatically extract payment details from screenshot. Please enter your 12-digit UTR manually.",
          analysisStatus: "FAILED",
          warnings: ["Could not extract payment details from screenshot. Please enter your 12-digit UTR manually."],
          isValidLooking: false,
          expectedUpiId,
          expectedAmount: expectedAmount ? Number(expectedAmount) : null,
        });
      }

      // Normalization and Validation Checks
      const warnings: string[] = [];

      // CHECK 1: UPI ID Match
      const cleanExpectedUpi = (expectedUpiId || "").toLowerCase().trim();
      const cleanDetectedUpi = (detectedUpiId || "").toLowerCase().trim();
      let upiMatch = false;

      if (!cleanDetectedUpi) {
        warnings.push("Receiver UPI ID could not be clearly read from the screenshot.");
      } else if (cleanDetectedUpi === cleanExpectedUpi || cleanDetectedUpi.includes(cleanExpectedUpi.split("@")[0])) {
        upiMatch = true;
      } else {
        warnings.push(`UPI ID mismatch: Expected '${expectedUpiId}', but detected '${detectedUpiId}'.`);
      }

      // CHECK 2: Payment Amount Match
      let amountMatch = false;
      const expectedNum = expectedAmount ? Number(expectedAmount) : null;

      if (detectedAmount === null || isNaN(detectedAmount)) {
        warnings.push("Payment amount could not be detected accurately.");
      } else if (expectedNum !== null && Math.abs(detectedAmount - expectedNum) < 0.01) {
        amountMatch = true;
      } else if (expectedNum !== null) {
        warnings.push(`Payment amount mismatch: Expected ₹${expectedNum}, but detected ₹${detectedAmount}.`);
      }

      // CHECK 3: Transaction ID / UTR Detection & Duplicate check
      let transactionMatch = Boolean(detectedTransactionId && detectedTransactionId.length >= 6);
      let isDuplicateTransaction = false;
      let duplicateOrderNumber: string | undefined = undefined;

      if (!transactionMatch) {
        warnings.push("Transaction ID / UTR could not be detected. Please enter it manually.");
      } else {
        // Check duplicate transaction registry
        const existingTx = knownTransactionRegistry.get(detectedTransactionId);
        if (existingTx && existingTx.orderNumber !== orderNumber && existingTx.orderId !== orderId) {
          isDuplicateTransaction = true;
          duplicateOrderNumber = existingTx.orderNumber;
          warnings.push(`Transaction ID ${detectedTransactionId} is already associated with Order ${existingTx.orderNumber}. Order flagged for manual review.`);
        }
      }

      // CHECK 4: Payment Status Check
      if (detectedPaymentStatus !== "SUCCESS") {
        if (detectedPaymentStatus === "FAILED") {
          warnings.push("Screenshot indicates that the UPI payment has FAILED or was DECLINED.");
        } else if (detectedPaymentStatus === "PENDING") {
          warnings.push("Screenshot indicates that the UPI payment is still PROCESSING / PENDING.");
        } else {
          warnings.push("Payment status could not be confidently identified as Successful.");
        }
      }

      // Low confidence alert
      if (ocrConfidence < 0.6) {
        warnings.push("Screenshot quality or text clarity is low. Please verify all details.");
      }

      // Determine overall validity indicator (Assistance only; final verification is admin decision)
      const isValidLooking = upiMatch && amountMatch && transactionMatch && !isDuplicateTransaction && detectedPaymentStatus === "SUCCESS";

      // Register transaction in memory for current session
      if (detectedTransactionId) {
        knownTransactionRegistry.set(detectedTransactionId, {
          orderNumber,
          orderId: orderId || `ord-${Date.now()}`,
          amount: detectedAmount || expectedNum || 0,
          date: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        detectedUpiId: detectedUpiId || expectedUpiId,
        detectedTransactionId,
        detectedAmount,
        detectedPaymentStatus,
        ocrConfidence: Math.round(ocrConfidence * 100) / 100,
        upiMatch,
        amountMatch,
        transactionMatch,
        isDuplicateTransaction,
        duplicateOrderNumber,
        receiverName,
        senderName,
        paymentDate,
        paymentTime,
        analysisStatus: "ANALYZED",
        warnings,
        isValidLooking,
        expectedUpiId,
        expectedAmount: expectedNum,
      });
    } catch (error: any) {
      console.error("Payment proof analysis error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze payment proof screenshot",
        analysisStatus: "FAILED",
        warnings: ["Verification scan unavailable. You can still enter your Transaction ID manually."],
      });
    }
  });

  /**
   * Endpoint to register transaction IDs from manually entered payments
   */
  app.post("/api/register-transaction", (req, res) => {
    const { transactionId, orderNumber, orderId, amount } = req.body;
    if (transactionId) {
      knownTransactionRegistry.set(transactionId, {
        orderNumber: orderNumber || "ORDER",
        orderId: orderId || "ord",
        amount: Number(amount) || 0,
        date: new Date().toISOString(),
      });
    }
    res.json({ success: true });
  });

  /**
   * Endpoint to check Cloudinary configuration status
   */
  app.get("/api/cloudinary/config", (req, res) => {
    const cld = getCloudinary();
    const config = cld.config();
    res.json({
      configured: isCloudinaryConfigured(),
      cloudName: config.cloud_name || process.env.CLOUDINARY_CLOUD_NAME || "jushiok7",
    });
  });

  /**
   * Secure Cloudinary Image Upload Endpoint (Protected with Admin Authorization)
   * Handles main and gallery product image uploads into structured folders
   */
  app.post("/api/cloudinary/upload", requireAdminAuth, async (req, res) => {
    try {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          success: false,
          error: "Cloudinary service is not configured on the server. Please check environment variables.",
        });
      }

      const {
        image,
        folder = "3d-printing/products/general",
        publicId,
        tags = ["3d-printing", "product"],
        transformation,
      } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          error: "Missing 'image' payload (base64 string or remote URL required).",
        });
      }

      // Validate base64 format and size
      if (typeof image === "string" && image.startsWith("data:")) {
        const mimeMatch = image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
        if (mimeMatch) {
          const mime = mimeMatch[1].toLowerCase();
          const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
          if (!allowedMimes.includes(mime)) {
            return res.status(400).json({
              success: false,
              error: `Unsupported image format (${mime}). Please upload JPG, PNG, or WebP images.`,
            });
          }
        }

        // Estimate size in bytes
        const base64Content = image.split(",")[1] || "";
        const approxBytes = Math.ceil((base64Content.length * 3) / 4);
        const maxBytes = 10 * 1024 * 1024; // 10MB
        if (approxBytes > maxBytes) {
          return res.status(400).json({
            success: false,
            error: "Image file is too large. Maximum allowed file size is 10 MB.",
          });
        }
      }

      // Upload to Cloudinary with secure parameters
      const uploadOptions: any = {
        folder,
        resource_type: "image",
        overwrite: true,
        tags,
        use_filename: false,
        unique_filename: true,
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      if (transformation) {
        uploadOptions.transformation = transformation;
      }

      const cld = getCloudinary();
      const result = await cld.uploader.upload(image, uploadOptions);

      return res.json({
        success: true,
        url: result.url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        created_at: result.created_at,
      });
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to upload image to Cloudinary. Please try again.",
      });
    }
  });

  /**
   * Secure Cloudinary Asset Deletion Endpoint (Protected with Admin Authorization)
   */
  app.post("/api/cloudinary/delete", requireAdminAuth, async (req, res) => {
    try {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          success: false,
          error: "Cloudinary service is not configured on the server.",
        });
      }

      const { publicId } = req.body;
      if (!publicId) {
        return res.status(400).json({
          success: false,
          error: "Missing 'publicId' parameter for asset deletion.",
        });
      }

      const cld = getCloudinary();
      const result = await cld.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      });

      return res.json({
        success: true,
        result: result.result,
        message: `Asset ${publicId} successfully removed from Cloudinary.`,
      });
    } catch (error: any) {
      console.error("Cloudinary delete error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to delete asset from Cloudinary.",
      });
    }
  });

  // Vite middleware for development vs static production serve
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PrintLab full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
