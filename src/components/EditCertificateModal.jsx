import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { normalizeDate, formatDateForDb } from '../utils/certificateHelpers';

const EditCertificateModal = ({ certificate, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    roll_no: '',
    email: '',
    phone: '',
    department: '',
    academic_year: '',
    course_name: '',
    location_or_institution: '',
    location: '',
    mode: '',
    issued_by: '',
    date_issued: '',
    // Status field removed - certificates can only be approved/rejected through Approval Requests
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (certificate && isOpen) {
      setFormData({
        name: certificate.name || '',
        roll_no: certificate.roll_no || '',
        email: certificate.email || '',
        phone: certificate.phone || '',
        department: certificate.department || '',
        academic_year: certificate.academic_year || '',
        course_name: certificate.course_name || '',
        location_or_institution: certificate.location_or_institution || '',
        location: certificate.location || '',
        mode: certificate.mode || '',
        issued_by: certificate.issued_by || '',
        date_issued: certificate.date_issued || '',
        // Status field removed - certificates can only be approved/rejected through Approval Requests
      });
      setError('');
    }
  }, [certificate, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name?.trim()) {
      setError('Name is required.');
      return;
    }

    setIsSaving(true);

    try {
      const updateData = {
        name: formData.name.trim(),
        roll_no: formData.roll_no.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        department: formData.department.trim(),
        academic_year: formData.academic_year.trim(),
        course_name: formData.course_name.trim(),
        location_or_institution: formData.location_or_institution.trim(),
        location: formData.location.trim(),
        mode: formData.mode.trim(),
        issued_by: formData.issued_by.trim(),
        date_issued: formData.date_issued,
        // Status is NOT updated here - certificates can only be approved/rejected through Approval Requests
      };

      const { error: updateError } = await supabase
        .from('certificates')
        .update(updateData)
        .eq('id', certificate.id);

      if (updateError) {
        throw updateError;
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update certificate');
      // eslint-disable-next-line no-console
      console.error('Update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-xl sm:rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
          <div>
            <h3 className="font-heading text-lg sm:text-xl md:text-2xl text-dark">Edit Certificate</h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">Update certificate information</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            disabled={isSaving}
          >
            <i className="fa fa-times text-lg sm:text-xl" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <i className="fa fa-circle-exclamation mr-2" aria-hidden="true" />
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:gap-4 md:gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Roll No</label>
              <input
                type="text"
                value={formData.roll_no}
                onChange={(e) => handleInputChange('roll_no', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Academic Year</label>
              <input
                type="text"
                value={formData.academic_year}
                onChange={(e) => handleInputChange('academic_year', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSaving}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Course Name</label>
              <input
                type="text"
                value={formData.course_name}
                onChange={(e) => handleInputChange('course_name', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Institution</label>
              <input
                type="text"
                value={formData.location_or_institution}
                onChange={(e) => handleInputChange('location_or_institution', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Mode</label>
              <select
                value={formData.mode}
                onChange={(e) => handleInputChange('mode', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSaving}
              >
                <option value="">Select Mode</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Issued By</label>
              <input
                type="text"
                value={formData.issued_by}
                onChange={(e) => handleInputChange('issued_by', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700">Date Issued</label>
              <input
                type="date"
                value={formData.date_issued ? formatDateForDb(normalizeDate(formData.date_issued) || new Date(formData.date_issued)) : ''}
                onChange={(e) => handleInputChange('date_issued', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isSaving}
              />
            </div>

            {/* Status field removed - certificates can only be approved/rejected through Approval Requests */}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 pt-4 sm:pt-6">
            <p className="text-[10px] sm:text-xs text-slate-500 text-center sm:text-left">
              Fields marked with <span className="text-red-500">*</span> are required.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-slate-200 px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="fa fa-times" aria-hidden="true" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={isSaving || !formData.name?.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? (
                  <>
                    <i className="fa fa-spinner fa-spin" aria-hidden="true" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <i className="fa fa-save" aria-hidden="true" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCertificateModal;

