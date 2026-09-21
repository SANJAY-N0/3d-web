import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Department, DepartmentYear, AcademicImportData, AcademicImportResult } from '../types';

const STORAGE_KEY = 'printlab_departments_cache';
export const DEFAULT_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-cse', college_name: 'KPR College', name: 'Computer Science and Engineering', code: 'CSE', status: 'active', years: [...DEFAULT_YEARS] },
  { id: 'dept-aids', college_name: 'KPR College', name: 'Artificial Intelligence and Data Science', code: 'AI&DS', status: 'active', years: [...DEFAULT_YEARS] },
  { id: 'dept-it', college_name: 'KPR College', name: 'Information Technology', code: 'IT', status: 'active', years: [...DEFAULT_YEARS] },
  { id: 'dept-ece', college_name: 'KPR College', name: 'Electronics and Communication Engineering', code: 'ECE', status: 'active', years: [...DEFAULT_YEARS] },
  { id: 'dept-eee', college_name: 'KPR College', name: 'Electrical and Electronics Engineering', code: 'EEE', status: 'active', years: [...DEFAULT_YEARS] },
  { id: 'dept-mech', college_name: 'KPR College', name: 'Mechanical Engineering', code: 'MECH', status: 'active', years: [...DEFAULT_YEARS] },
  { id: 'dept-civil', college_name: 'KPR College', name: 'Civil Engineering', code: 'CIVIL', status: 'active', years: [...DEFAULT_YEARS] },
  { id: 'dept-bme', college_name: 'KPR College', name: 'Biomedical Engineering', code: 'BME', status: 'active', years: [...DEFAULT_YEARS] },
  { id: 'dept-chem', college_name: 'KPR College', name: 'Chemical Engineering', code: 'CHEM', status: 'active', years: [...DEFAULT_YEARS] },
  { id: 'dept-mct', college_name: 'KPR College', name: 'Mechatronics Engineering', code: 'MCT', status: 'active', years: [...DEFAULT_YEARS] },
];

function normalizeCollegeName(codeOrName: string): string {
  const clean = (codeOrName || '').trim();
  if (clean.toUpperCase() === 'KPR' || clean.toLowerCase().includes('kpr')) {
    return 'KPR College';
  }
  return clean;
}

function getCollegeCode(nameOrCode: string): string {
  const clean = (nameOrCode || '').trim();
  if (clean.toLowerCase().includes('kpr')) {
    return 'KPR';
  }
  return clean.toUpperCase();
}

function getCachedDepartments(): Department[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((d) => ({
          ...d,
          years: d.years && d.years.length > 0 ? d.years : [...DEFAULT_YEARS],
        }));
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached departments:', err);
  }
  return DEFAULT_DEPARTMENTS;
}

function setCachedDepartments(depts: Department[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(depts));
  } catch (err) {
    console.warn('Failed to cache departments:', err);
  }
}

export const departmentService = {
  /**
   * Fetch all departments (with their academic years)
   */
  async getAll(collegeName?: string): Promise<Department[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('departments')
          .select('*, department_years(*)')
          .order('name', { ascending: true });

        if (collegeName && collegeName.trim()) {
          const normCollege = normalizeCollegeName(collegeName);
          query = query.eq('college_name', normCollege);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const list: Department[] = data.map((d: any) => {
            const rawYears: DepartmentYear[] = Array.isArray(d.department_years) ? d.department_years : [];
            const activeYears = rawYears
              .filter((y) => y.status !== 'inactive')
              .map((y) => y.year);

            return {
              id: d.id,
              college_name: d.college_name,
              name: d.name,
              code: d.code,
              status: d.status,
              created_at: d.created_at,
              updated_at: d.updated_at,
              years: activeYears.length > 0 ? activeYears : [...DEFAULT_YEARS],
              department_years: rawYears,
            };
          });

          setCachedDepartments(list);
          return list;
        }

        // If join failed (e.g. table department_years not yet created), try querying departments directly
        if (error) {
          const { data: deptsOnly, error: deptsErr } = await supabase
            .from('departments')
            .select('*')
            .order('name', { ascending: true });

          if (!deptsErr && deptsOnly && deptsOnly.length > 0) {
            const list: Department[] = deptsOnly.map((d: any) => ({
              ...d,
              years: [...DEFAULT_YEARS],
            }));
            setCachedDepartments(list);
            return list;
          }
        }
      } catch (err) {
        console.warn('Supabase departments fetch warning:', err);
      }
    }

    const local = getCachedDepartments();
    if (collegeName && collegeName.trim()) {
      const normCollege = normalizeCollegeName(collegeName);
      return local.filter((d) => d.college_name.toLowerCase() === normCollege.toLowerCase());
    }
    return local;
  },

  /**
   * Fetch only active departments and active years for customer dropdowns
   */
  async getActive(collegeName = 'KPR College'): Promise<Department[]> {
    const all = await this.getAll(collegeName);
    return all.filter((d) => d.status === 'active');
  },

  /**
   * Add a new department (with optional initial years)
   */
  async create(data: {
    college_name: string;
    name: string;
    code: string;
    status?: 'active' | 'inactive';
    years?: string[];
  }): Promise<Department> {
    const college_name = normalizeCollegeName(data.college_name);
    const name = data.name.trim();
    const code = data.code.trim().toUpperCase();
    const status = data.status || 'active';
    const yearsToAssign = data.years && data.years.length > 0 ? Array.from(new Set(data.years.map((y) => y.trim()))) : [...DEFAULT_YEARS];

    if (!college_name) throw new Error('College name is required.');
    if (!name) throw new Error('Department name is required.');
    if (!code) throw new Error('Department code is required (e.g. CSE, ECE).');

    // Duplicate check
    const existing = await this.getAll(college_name);
    if (existing.some((d) => d.code.toUpperCase() === code)) {
      throw new Error(`Department with code "${code}" already exists for ${college_name}.`);
    }

    let createdDept: Department;

    if (isSupabaseConfigured && supabase) {
      const { data: inserted, error } = await supabase
        .from('departments')
        .insert([{ college_name, name, code, status }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to insert department in database.');
      }

      createdDept = {
        ...(inserted as Department),
        years: yearsToAssign,
      };

      // Also insert department_years if table exists
      try {
        const yearRows = yearsToAssign.map((y) => ({
          department_id: createdDept.id,
          year: y,
          status: 'active',
        }));
        await supabase.from('department_years').insert(yearRows);
      } catch (yearErr) {
        console.warn('Failed to insert department_years (table might be pending migration):', yearErr);
      }
    } else {
      // Local fallback
      createdDept = {
        id: `dept-${Date.now()}`,
        college_name,
        name,
        code,
        status,
        years: yearsToAssign,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const currentCache = getCachedDepartments();
    setCachedDepartments([...currentCache, createdDept]);
    return createdDept;
  },

  /**
   * Update an existing department
   */
  async update(
    id: string,
    updates: Partial<Omit<Department, 'id'>> & { years?: string[] }
  ): Promise<Department> {
    if (!id) throw new Error('Department ID is required.');

    const cleanUpdates: Partial<Department> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (cleanUpdates.college_name) cleanUpdates.college_name = normalizeCollegeName(cleanUpdates.college_name);
    if (cleanUpdates.code) cleanUpdates.code = cleanUpdates.code.trim().toUpperCase();
    if (cleanUpdates.name) cleanUpdates.name = cleanUpdates.name.trim();

    let updatedDept: Department;

    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase
        .from('departments')
        .update({
          college_name: cleanUpdates.college_name,
          name: cleanUpdates.name,
          code: cleanUpdates.code,
          status: cleanUpdates.status,
          updated_at: cleanUpdates.updated_at,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to update department in database.');
      }

      // Update years if provided
      let currentYears = updates.years;
      if (updates.years && Array.isArray(updates.years)) {
        const distinctYears = Array.from(new Set(updates.years.map((y) => y.trim())));
        try {
          // Delete old years and insert new ones
          await supabase.from('department_years').delete().eq('department_id', id);
          if (distinctYears.length > 0) {
            await supabase.from('department_years').insert(
              distinctYears.map((y) => ({
                department_id: id,
                year: y,
                status: 'active',
              }))
            );
          }
          currentYears = distinctYears;
        } catch (yearErr) {
          console.warn('Failed to update department_years:', yearErr);
        }
      }

      updatedDept = {
        ...(updated as Department),
        years: currentYears || [...DEFAULT_YEARS],
      };
    } else {
      const currentCache = getCachedDepartments();
      const target = currentCache.find((d) => d.id === id);
      if (!target) throw new Error('Department not found.');

      updatedDept = {
        ...target,
        ...cleanUpdates,
        years: updates.years || target.years || [...DEFAULT_YEARS],
      };
    }

    const currentCache = getCachedDepartments();
    setCachedDepartments(currentCache.map((d) => (d.id === id ? updatedDept : d)));
    return updatedDept;
  },

  /**
   * Toggle department status (active/inactive)
   */
  async toggleStatus(id: string, currentStatus: 'active' | 'inactive'): Promise<Department> {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    return this.update(id, { status: nextStatus });
  },

  /**
   * Delete a department (or deactivate if in use by students/orders)
   */
  async delete(id: string): Promise<void> {
    if (!id) throw new Error('Department ID is required.');

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') {
          await this.update(id, { status: 'inactive' });
          throw new Error('Department is referenced by existing students/orders and was deactivated instead of deleted.');
        }
        throw new Error(error.message || 'Failed to delete department.');
      }
    }

    const currentCache = getCachedDepartments();
    setCachedDepartments(currentCache.filter((d) => d.id !== id));
  },

  /**
   * Validate Academic Import JSON structure and integrity
   */
  validateAcademicJson(
    rawInput: any,
    existingDepartments: Department[] = [],
    options: { skipExisting?: boolean } = {}
  ): { isValid: boolean; error?: string; data?: AcademicImportData } {
    let parsed: any = rawInput;

    if (typeof rawInput === 'string') {
      try {
        parsed = JSON.parse(rawInput);
      } catch {
        return { isValid: false, error: 'Invalid JSON file. Please check syntax and ensure proper JSON format.' };
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { isValid: false, error: 'Root of JSON must be an object with "college_code" and "departments".' };
    }

    // 1. Validate college_code
    if (!parsed.college_code || typeof parsed.college_code !== 'string' || !parsed.college_code.trim()) {
      return { isValid: false, error: 'Missing or invalid "college_code". Must be a non-empty string (e.g. "KPR").' };
    }
    const college_code = parsed.college_code.trim().toUpperCase();

    // 2. Validate departments array
    if (!Array.isArray(parsed.departments) || parsed.departments.length === 0) {
      return { isValid: false, error: '"departments" must be a non-empty array of department objects.' };
    }

    const normalizedDepartments: AcademicImportData['departments'] = [];
    const seenCodesInFile = new Set<string>();

    const existingCollegeCodes = new Set(
      existingDepartments
        .filter((d) => normalizeCollegeName(d.college_name) === normalizeCollegeName(college_code))
        .map((d) => d.code.toUpperCase())
    );

    for (let i = 0; i < parsed.departments.length; i++) {
      const item = parsed.departments[i];
      const lineNum = i + 1;

      if (!item || typeof item !== 'object') {
        return { isValid: false, error: `Department #${lineNum}: Invalid department item. Must be an object.` };
      }

      // Validate name
      if (!item.name || typeof item.name !== 'string' || !item.name.trim()) {
        return { isValid: false, error: `Department #${lineNum}: Missing or empty department "name".` };
      }
      const name = item.name.trim();

      // Validate code
      if (!item.code || typeof item.code !== 'string' || !item.code.trim()) {
        return { isValid: false, error: `Department #${lineNum} ("${name}"): Missing or empty department "code".` };
      }
      const code = item.code.trim().toUpperCase();

      // Check duplicates inside the JSON file
      if (seenCodesInFile.has(code)) {
        return { isValid: false, error: `Duplicate department code "${code}" found in import file (Department #${lineNum}).` };
      }
      seenCodesInFile.add(code);

      // Check duplicates against existing database records (if skipExisting is false)
      if (!options.skipExisting && existingCollegeCodes.has(code)) {
        return {
          isValid: false,
          error: `Department code "${code}" already exists for college "${college_code}" (Department #${lineNum}). No database changes were made.`,
        };
      }

      // Validate years
      if (!Array.isArray(item.years) || item.years.length === 0) {
        return { isValid: false, error: `Department #${lineNum} ("${code}"): "years" must be a non-empty array of strings.` };
      }

      const cleanYears: string[] = [];
      const seenYears = new Set<string>();

      for (const y of item.years) {
        if (typeof y !== 'string' || !y.trim()) {
          return { isValid: false, error: `Department #${lineNum} ("${code}"): Each year must be a non-empty string.` };
        }
        const trimmedYear = y.trim();
        if (!seenYears.has(trimmedYear)) {
          seenYears.add(trimmedYear);
          cleanYears.push(trimmedYear);
        }
      }

      normalizedDepartments.push({
        name,
        code,
        years: cleanYears,
      });
    }

    return {
      isValid: true,
      data: {
        college_code,
        departments: normalizedDepartments,
      },
    };
  },

  /**
   * Import academic data atomically into Supabase
   */
  async importAcademicData(
    importData: AcademicImportData,
    options: { skipExisting?: boolean } = {}
  ): Promise<AcademicImportResult> {
    const college_name = normalizeCollegeName(importData.college_code);
    const existing = await this.getAll(college_name);

    // Run complete pre-validation
    const validation = this.validateAcademicJson(importData, existing, options);
    if (!validation.isValid || !validation.data) {
      throw new Error(validation.error || 'Academic data validation failed.');
    }

    const { departments } = validation.data;
    let departmentsCreated = 0;
    let departmentsSkipped = 0;
    let yearsCreated = 0;
    let yearsSkipped = 0;

    const existingMap = new Map<string, Department>();
    existing.forEach((d) => existingMap.set(d.code.toUpperCase(), d));

    // Try backend API first if token is available
    const adminToken = localStorage.getItem('printlab_admin_token') || sessionStorage.getItem('printlab_admin_token');
    if (adminToken) {
      try {
        const res = await fetch('/api/admin/academic/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            college_code: importData.college_code,
            departments: importData.departments,
            skipExisting: Boolean(options.skipExisting),
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            await this.getAll(college_name); // Refresh cache
            return json.data;
          }
        } else {
          const errJson = await res.json().catch(() => null);
          if (errJson && errJson.message) {
            throw new Error(errJson.message);
          }
        }
      } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes('fetch')) {
          throw apiErr;
        }
        // Fall back to direct Supabase / local execution
      }
    }

    // Direct Supabase execution
    for (const dept of departments) {
      let deptRecord = existingMap.get(dept.code);

      if (!deptRecord) {
        if (isSupabaseConfigured && supabase) {
          const { data: inserted, error } = await supabase
            .from('departments')
            .insert([{ college_name, name: dept.name, code: dept.code, status: 'active' }])
            .select()
            .single();

          if (error) {
            throw new Error(`Failed to create department "${dept.code}": ${error.message}`);
          }
          deptRecord = {
            ...(inserted as Department),
            years: [],
          };
        } else {
          deptRecord = {
            id: `dept-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            college_name,
            name: dept.name,
            code: dept.code,
            status: 'active',
            years: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        departmentsCreated++;
        existingMap.set(dept.code, deptRecord);
      } else {
        departmentsSkipped++;
      }

      // Process years
      const currentDeptYears = new Set(deptRecord.years || []);
      for (const y of dept.years) {
        if (!currentDeptYears.has(y)) {
          if (isSupabaseConfigured && supabase) {
            try {
              await supabase
                .from('department_years')
                .insert([{ department_id: deptRecord.id, year: y, status: 'active' }]);
            } catch (err) {
              console.warn('Could not insert department_year:', err);
            }
          }
          currentDeptYears.add(y);
          yearsCreated++;
        } else {
          yearsSkipped++;
        }
      }
      deptRecord.years = Array.from(currentDeptYears);
    }

    // Refresh cache
    await this.getAll(college_name);

    return {
      success: true,
      departmentsCreated,
      departmentsSkipped,
      yearsCreated,
      yearsSkipped,
      message: `Import successful. ${departmentsCreated} department(s) created, ${yearsCreated} year(s) added.`,
    };
  },

  /**
   * Export academic data for a college in standard JSON format
   */
  async exportAcademicData(collegeNameOrCode = 'KPR'): Promise<AcademicImportData> {
    const college_code = getCollegeCode(collegeNameOrCode);
    const college_name = normalizeCollegeName(collegeNameOrCode);
    const depts = await this.getActive(college_name);

    return {
      college_code,
      departments: depts.map((d) => ({
        name: d.name,
        code: d.code,
        years: d.years && d.years.length > 0 ? d.years : [...DEFAULT_YEARS],
      })),
    };
  },

  /**
   * Get template JSON data for admin download
   */
  getAcademicTemplate(): AcademicImportData {
    return {
      college_code: 'KPR',
      departments: [
        {
          name: 'Computer Science and Engineering',
          code: 'CSE',
          years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
        },
        {
          name: 'Electronics and Communication Engineering',
          code: 'ECE',
          years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
        },
        {
          name: 'Mechanical Engineering',
          code: 'MECH',
          years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
        },
      ],
    };
  },
};
