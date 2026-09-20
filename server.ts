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
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
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

      const phoneClean = String(phone || "").replace(/\D/g, "");
      if (!phoneClean || phoneClean.length !== 10) {
        errors.phone = "A valid 10-digit mobile number is required.";
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
        const { data: orderData } = await supabaseServer
          .from("orders")
          .select("payment_session_expires_at, order_status")
          .or(`id.eq.${orderId},order_number.eq.${orderId}`)
          .maybeSingle();

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
          await supabaseServer
            .from("orders")
            .update({ order_status: "PAYMENT_EXPIRED" })
            .or(`id.eq.${orderId},order_number.eq.${orderId}`);
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
   * AI OCR Endpoint for UPI Payment Proof Screenshot
   * Analyzes screenshot using Gemini API / OCR & image understanding
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
          console.warn("Gemini vision analysis error:", aiErr);
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
      console.error("Payment proof OCR analysis error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze payment proof screenshot",
        analysisStatus: "FAILED",
        warnings: ["AI OCR processing failed. You can still enter your Transaction ID manually."],
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
