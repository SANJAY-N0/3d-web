import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { departmentService, DEFAULT_YEARS } from '../../services/departmentService';
import { Department, AcademicImportData } from '../../types';
import { useToast } from '../../components/common/Toast';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCw,
  Search,
  Building2,
  AlertCircle,
  X,
  Save,
  Upload,
  Download,
  FileText,
  Check,
  Calendar,
} from 'lucide-react';

export const AdminDepartments: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCollege, setFilterCollege] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Department form state
  const [newCollege, setNewCollege] = useState('KPR College');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newYear, setNewYear] = useState('All Years (1st - 4th)');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Department modal state
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editCollege, setEditCollege] = useState('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editYears, setEditYears] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [isUpdating, setIsUpdating] = useState(false);

  // JSON Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    college_code: string;
    departmentsCount: number;
    yearsCount: number;
    rawParsed: AcademicImportData;
  } | null>(null);
  const [skipExisting, setSkipExisting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await departmentService.getAll();
      setDepartments(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load departments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handle Manual Department Creation
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) {
      showToast('Please enter department name and code.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const yearsToAssign =
        newYear === 'All Years (1st - 4th)'
          ? [...DEFAULT_YEARS]
          : [newYear.trim()];

      await departmentService.create({
        college_name: newCollege.trim(),
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
        status: newStatus,
        years: yearsToAssign,
      });

      showToast(`Department "${newCode.toUpperCase()}" added successfully!`, 'success');
      setNewName('');
      setNewCode('');
      setNewYear('All Years (1st - 4th)');
      setNewStatus('active');
      await fetchDepartments();
    } catch (err: any) {
      showToast(err.message || 'Failed to add department.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle JSON File Selection & Pre-validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportError(null);
    setImportSuccessMessage(null);

    if (!file) {
      setSelectedFile(null);
      setImportPreview(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setImportError('Please select a valid .json file.');
      setSelectedFile(null);
      setImportPreview(null);
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Pre-validate
        const validation = departmentService.validateAcademicJson(parsed, departments, { skipExisting: false });
        if (!validation.isValid || !validation.data) {
          setImportError(validation.error || 'Invalid JSON academic structure.');
          setImportPreview(null);
          return;
        }

        const validData = validation.data;
        const totalYears = validData.departments.reduce((acc, d) => acc + (d.years?.length || 0), 0);

        setImportPreview({
          fileName: file.name,
          college_code: validData.college_code,
          departmentsCount: validData.departments.length,
          yearsCount: totalYears,
          rawParsed: validData,
        });
      } catch (err: any) {
        setImportError(`Failed to parse JSON: ${err.message || 'Malformed JSON file'}`);
        setImportPreview(null);
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read the selected file.');
      setImportPreview(null);
    };

    reader.readAsText(file);
  };

  // Handle JSON Import Execution
  const handleExecuteImport = async () => {
    if (!importPreview) return;

    setIsImporting(true);
    setImportError(null);
    setImportSuccessMessage(null);

    try {
      const result = await departmentService.importAcademicData(importPreview.rawParsed, {
        skipExisting,
      });

      setImportSuccessMessage(
        `Academic data imported successfully. ${result.departmentsCreated} department(s) created, ${result.yearsCreated} year(s) added.${
          result.departmentsSkipped > 0 || result.yearsSkipped > 0
            ? ` (${result.departmentsSkipped} depts and ${result.yearsSkipped} years skipped as existing)`
            : ''
        }`
      );
      showToast('Academic data imported successfully!', 'success');

      // Clear selection
      setSelectedFile(null);
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await fetchDepartments();
    } catch (err: any) {
      setImportError(err.message || 'Import failed. No database changes were made.');
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Cancel Import
  const handleCancelImport = () => {
    setSelectedFile(null);
    setImportPreview(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download Academic JSON
  const handleDownloadJson = async () => {
    try {
      const exportTargetCollege = filterCollege === 'All' ? 'KPR' : filterCollege;
      const data = await departmentService.exportAcademicData(exportTargetCollege);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `printlab-academic-data-${data.college_code}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${data.departments.length} departments to JSON.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export academic data.', 'error');
    }
  };

  // Download JSON Template
  const handleDownloadTemplate = () => {
    try {
      const template = departmentService.getAcademicTemplate();
      const jsonStr = JSON.stringify(template, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'printlab-academic-template.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Template downloaded: printlab-academic-template.json', 'info');
    } catch (err: any) {
      showToast('Failed to download template.', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setEditCollege(dept.college_name);
    setEditName(dept.name);
    setEditCode(dept.code);
    setEditYears(dept.years && dept.years.length > 0 ? [...dept.years] : [...DEFAULT_YEARS]);
    setEditStatus(dept.status);
  };

  // Toggle year selection in edit modal
  const handleToggleEditYear = (yr: string) => {
    if (editYears.includes(yr)) {
      if (editYears.length === 1) {
        showToast('Department must have at least one active year.', 'error');
        return;
      }
      setEditYears(editYears.filter((y) => y !== yr));
    } else {
      setEditYears([...editYears, yr]);
    }
  };

  // Update Department & Years
  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    if (!editName.trim() || !editCode.trim()) {
      showToast('Department name and code cannot be empty.', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      await departmentService.update(editingDept.id, {
        college_name: editCollege.trim(),
        name: editName.trim(),
        code: editCode.trim().toUpperCase(),
        status: editStatus,
        years: editYears,
      });

      showToast(`Department "${editCode.toUpperCase()}" updated successfully!`, 'success');
      setEditingDept(null);
      await fetchDepartments();
    } catch (err: any) {
      showToast(err.message || 'Failed to update department.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle Department Active/Inactive Status
  const handleToggleStatus = async (dept: Department) => {
    try {
      const updated = await departmentService.toggleStatus(dept.id, dept.status);
      showToast(
        `Department "${dept.code}" ${updated.status === 'active' ? 'activated' : 'deactivated'}.`,
        'info'
      );
      await fetchDepartments();
    } catch (err: any) {
      showToast(err.message || 'Failed to change status.', 'error');
    }
  };

  // Delete Department
  const handleDelete = async (dept: Department) => {
    if (!window.confirm(`Are you sure you want to delete "${dept.name} (${dept.code})"? If referenced by students or orders, it will be deactivated instead.`)) {
      return;
    }

    try {
      await departmentService.delete(dept.id);
      showToast(`Department "${dept.code}" deleted successfully.`, 'success');
      await fetchDepartments();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete department.', 'error');
      await fetchDepartments();
    }
  };

  const collegesList = Array.from(new Set(departments.map((d) => d.college_name)));

  const filteredDepartments = departments.filter((d) => {
    const matchesCollege = filterCollege === 'All' || d.college_name === filterCollege;
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.college_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCollege && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-5xl">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white flex items-center gap-2.5">
              <GraduationCap className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
              <span>Academic Management</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Manage college departments and academic years. Import and export data directly using JSON.
            </p>
          </div>

          <button
            onClick={fetchDepartments}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-semibold border border-slate-300 dark:border-neutral-700 transition-colors cursor-pointer w-fit"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Section 1: Add Department Form */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-neutral-800 pb-4">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">Add Department</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Register a new academic department for student registration and campus delivery.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddDepartment} className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
            <div className="sm:col-span-3 space-y-1.5">
              <label className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">College *</label>
              <input
                type="text"
                required
                value={newCollege}
                onChange={(e) => setNewCollege(e.target.value)}
                placeholder="e.g. KPR College"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">Department Name *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Computer Science and Engineering"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">Department Code *</label>
              <input
                type="text"
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. CSE"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">Year</label>
              <select
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="All Years (1st - 4th)">All Years (1st - 4th)</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as 'active' | 'inactive')}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="sm:col-span-12 flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-cyan-600/20 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>+ Add Department</span>
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Import & Export Academic Data */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">Import Academic Data</h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Bulk upload departments and academic years using a structured JSON file.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadJson}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-semibold border border-slate-300 dark:border-neutral-700 transition-colors cursor-pointer"
                title="Export current academic structure to JSON"
              >
                <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Download JSON</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-semibold border border-slate-300 dark:border-neutral-700 transition-colors cursor-pointer"
                title="Download JSON template file"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Download JSON Template</span>
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* File Upload Trigger Area */}
          {!importPreview && (
            <div className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-cyan-500 dark:hover:border-cyan-500/80 rounded-2xl p-6 text-center transition-colors">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md shadow-cyan-600/20 inline-flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload JSON</span>
                  </button>
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-2 font-mono">
                    Supported: .json (application/json)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Import Error Banner */}
          {importError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">Import failed</div>
                <div className="text-[11px] leading-relaxed font-mono">{importError}</div>
              </div>
            </div>
          )}

          {/* Import Success Banner */}
          {importSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3 text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">✓ Academic data imported successfully</div>
                <div className="text-[11px] leading-relaxed">{importSuccessMessage}</div>
              </div>
            </div>
          )}

          {/* Import Preview Card (Atomic Confirmation) */}
          {importPreview && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-neutral-800 pb-3">
                <div className="font-semibold text-slate-800 dark:text-neutral-200 text-xs flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-600" />
                  <span>File: <strong className="font-mono text-cyan-600 dark:text-cyan-400">{importPreview.fileName}</strong></span>
                </div>
                <div className="font-mono text-xs text-slate-600 dark:text-neutral-400">
                  College Code: <strong className="text-slate-900 dark:text-white">{importPreview.college_code}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400">Departments</span>
                  <p className="font-display font-bold text-lg text-slate-900 dark:text-white mt-0.5">
                    {importPreview.departmentsCount}
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400">Total Years</span>
                  <p className="font-display font-bold text-lg text-slate-900 dark:text-white mt-0.5">
                    {importPreview.yearsCount}
                  </p>
                </div>

                <div className="col-span-2 flex items-center p-3 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipExisting}
                      onChange={(e) => setSkipExisting(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                    />
                    <span>Skip / Merge existing departments if already present</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelImport}
                  disabled={isImporting}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isImporting}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-600/20 disabled:opacity-50 transition-all"
                >
                  {isImporting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Validating & Importing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Validate & Import</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Department Directory & Filtering */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-4">
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span>Existing Departments ({filteredDepartments.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Active departments and their academic years appear in student registration and order forms.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* College Filter */}
              <select
                value={filterCollege}
                onChange={(e) => setFilterCollege(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-800 dark:text-neutral-200 focus:outline-none"
              >
                <option value="All">All Colleges</option>
                {collegesList.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dept or code..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-800 dark:text-neutral-200 focus:outline-none w-44"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-neutral-400">No departments match your filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-neutral-800 text-slate-400 dark:text-neutral-500 font-mono uppercase text-[11px]">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Department Name</th>
                    <th className="py-3 px-4">Academic Years</th>
                    <th className="py-3 px-4">College</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                  {filteredDepartments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-neutral-950/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                        {dept.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {dept.name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(dept.years && dept.years.length > 0 ? dept.years : DEFAULT_YEARS).map((yr) => (
                            <span
                              key={yr}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[10px] font-mono text-slate-700 dark:text-neutral-300"
                            >
                              {yr}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-neutral-400 whitespace-nowrap">
                        {dept.college_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(dept)}
                          title="Click to toggle status"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border cursor-pointer transition-all ${
                            dept.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 hover:bg-emerald-100'
                              : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border-slate-300 dark:border-neutral-700 hover:bg-slate-200'
                          }`}
                        >
                          {dept.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(dept)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-neutral-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Edit department & years"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete or Deactivate department"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Department Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Edit Department & Years</span>
              </h3>
              <button
                onClick={() => setEditingDept(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDepartment} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">College *</label>
                <input
                  type="text"
                  required
                  value={editCollege}
                  onChange={(e) => setEditCollege(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">Department Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">Code *</label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none"
                />
              </div>

              {/* Manage Academic Years */}
              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Academic Years</span>
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {DEFAULT_YEARS.map((yr) => {
                    const isChecked = editYears.includes(yr);
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => handleToggleEditYear(yr)}
                        className={`p-2 rounded-xl text-xs font-mono font-medium border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-500/50 text-cyan-800 dark:text-cyan-200'
                            : 'bg-slate-50 dark:bg-neutral-950 border-slate-300 dark:border-neutral-800 text-slate-500 dark:text-neutral-400'
                        }`}
                      >
                        <span>{yr}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/20 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
