import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { settingsAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    contactNumbers: [''],
    email: '',
    panNumber: '',
    regNo: '',
    logo: '',
    defaultCurrency: 'NPR',
    defaultLanguage: 'en',
    conversionRate: 1.6,
    nepaliDateFormat: '2082-07-24',
    ticketRules: ['']
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const { currentBranch } = useApp();

  useEffect(() => {
    if (currentBranch) {
      fetchSettings();
    }
  }, [currentBranch]);

  const fetchSettings = async () => {
    if (!currentBranch) return;
    
    try {
      setLoading(true);
      const response = await settingsAPI.getByBranch(currentBranch._id);
      setSettings(response.data.settings);
      
      if (response.data.settings) {
        setFormData({
          companyName: response.data.settings.companyName,
          companyAddress: response.data.settings.companyAddress,
          contactNumbers: response.data.settings.contactNumbers.length > 0 
            ? response.data.settings.contactNumbers 
            : [''],
          email: response.data.settings.email || '',
          panNumber: response.data.settings.panNumber || '',
          regNo: response.data.settings.regNo || '',
          logo: response.data.settings.logo || '',
          defaultCurrency: response.data.settings.defaultCurrency,
          defaultLanguage: response.data.settings.defaultLanguage,
          conversionRate: response.data.settings.conversionRate,
          nepaliDateFormat: response.data.settings.nepaliDateFormat,
          ticketRules: response.data.settings.ticketRules.length > 0 
            ? response.data.settings.ticketRules 
            : ['']
        });
        if (response.data.settings.logo) {
          setLogoPreview(response.data.settings.logo);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await settingsAPI.update(currentBranch._id, {
        ...formData,
        contactNumbers: formData.contactNumbers.filter(num => num.trim() !== ''),
        ticketRules: formData.ticketRules.filter(rule => rule.trim() !== '')
      });
      
      alert('Settings saved successfully!');
      fetchSettings(); // Reload settings
      // Trigger sidebar refresh by dispatching custom event
      window.dispatchEvent(new Event('settingsUpdated'));
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleContactNumberChange = (index, value) => {
    const updatedNumbers = [...formData.contactNumbers];
    updatedNumbers[index] = value;
    setFormData({ ...formData, contactNumbers: updatedNumbers });
  };

  const addContactNumber = () => {
    setFormData({
      ...formData,
      contactNumbers: [...formData.contactNumbers, '']
    });
  };

  const removeContactNumber = (index) => {
    if (formData.contactNumbers.length > 1) {
      const updatedNumbers = formData.contactNumbers.filter((_, i) => i !== index);
      setFormData({ ...formData, contactNumbers: updatedNumbers });
    }
  };

  const handleTicketRuleChange = (index, value) => {
    const updatedRules = [...formData.ticketRules];
    updatedRules[index] = value;
    setFormData({ ...formData, ticketRules: updatedRules });
  };

  const addTicketRule = () => {
    setFormData({
      ...formData,
      ticketRules: [...formData.ticketRules, '']
    });
  };

  const removeTicketRule = (index) => {
    if (formData.ticketRules.length > 1) {
      const updatedRules = formData.ticketRules.filter((_, i) => i !== index);
      setFormData({ ...formData, ticketRules: updatedRules });
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setFormData({ ...formData, logo: base64String });
        setLogoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData({ ...formData, logo: '' });
    setLogoPreview(null);
  };

  const currencies = [
    { value: 'NPR', label: 'Nepalese Rupee (रु)' },
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'INR', label: 'Indian Rupee (₹)' }
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'np', label: 'Nepali' },
    { value: 'hi', label: 'Hindi' }
  ];

  if (loading) {
    return <Loader text="Loading settings..." />;
  }

  return (
    <div>
      <NotificationContainer />
      
      <div className="d-flex justify-between align-center mb-3">
        <h1>System Settings</h1>
        <button 
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-2">
          {/* Company Information */}
          <div className="card">
            <h3>Company Information</h3>
            
            {/* Logo Upload Section */}
            <div className="form-group">
              <label className="form-label">Company Logo</label>
              <div className="d-flex gap-3 align-center">
                {logoPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img 
                      src={logoPreview} 
                      alt="Logo Preview" 
                      style={{ 
                        maxWidth: '150px', 
                        maxHeight: '100px', 
                        objectFit: 'contain',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '8px',
                        backgroundColor: '#f8f9fa'
                      }} 
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={removeLogo}
                      style={{ position: 'absolute', top: '-8px', right: '-8px', borderRadius: '50%', width: '24px', height: '24px', padding: 0 }}
                      title="Remove logo"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div style={{ 
                    width: '150px', 
                    height: '100px', 
                    border: '2px dashed #ddd', 
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8f9fa',
                    color: '#999'
                  }}>
                    No Logo
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="form-control"
                    style={{ width: 'auto' }}
                  />
                  <small className="text-muted d-block mt-1">
                    Upload logo (max 2MB, JPG/PNG/GIF)
                  </small>
                </div>
              </div>
              <small className="text-muted d-block mt-2">
                This logo will appear in the sidebar header. Recommended size: 200x80px
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
                placeholder="Enter company name"
              />
              <small className="text-muted d-block mt-1">
                This name will appear below the logo in the sidebar
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Company Address</label>
              <textarea
                className="form-control"
                value={formData.companyAddress}
                onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                required
                rows="3"
                placeholder="Enter company address"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Numbers</label>
              {formData.contactNumbers.map((number, index) => (
                <div key={index} className="d-flex gap-2 mb-2">
                  <input
                    type="tel"
                    className="form-control"
                    value={number}
                    onChange={(e) => handleContactNumberChange(index, e.target.value)}
                    placeholder="Enter contact number"
                  />
                  {formData.contactNumbers.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => removeContactNumber(index)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={addContactNumber}
              >
                + Add Number
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>

            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <input
                type="text"
                className="form-control"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                placeholder="Enter PAN number"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Registration Number</label>
              <input
                type="text"
                className="form-control"
                value={formData.regNo}
                onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                placeholder="Enter company registration number"
              />
              <small className="text-muted d-block mt-1">
                This appears on PDF exports and official documents.
              </small>
            </div>
          </div>

          {/* System Settings */}
          <div className="card">
            <h3>System Configuration</h3>
            
            <div className="form-group">
              <label className="form-label">Default Currency</label>
              <select
                className="form-control"
                value={formData.defaultCurrency}
                onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
              >
                {currencies.map(currency => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Default Language</label>
              <select
                className="form-control"
                value={formData.defaultLanguage}
                onChange={(e) => setFormData({ ...formData, defaultLanguage: e.target.value })}
              >
                {languages.map(language => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Currency Conversion Rate (USD to NPR)</label>
              <input
                type="number"
                className="form-control"
                value={formData.conversionRate}
                onChange={(e) => setFormData({ ...formData, conversionRate: parseFloat(e.target.value) })}
                step="0.01"
                min="1"
                placeholder="Enter conversion rate"
              />
              <small className="text-muted">
                Current rate: 1 USD = {formData.conversionRate} NPR
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Nepali Date Format</label>
              <input
                type="text"
                className="form-control"
                value={formData.nepaliDateFormat}
                onChange={(e) => setFormData({ ...formData, nepaliDateFormat: e.target.value })}
                placeholder="e.g., 2082-07-24"
              />
            </div>
          </div>
        </div>

        {/* Ticket Rules */}
        <div className="card">
          <h3>Ticket Rules & Terms</h3>
          
          <div className="form-group">
            <label className="form-label">Ticket Rules (will appear on printed tickets)</label>
            {formData.ticketRules.map((rule, index) => (
              <div key={index} className="d-flex gap-2 mb-2">
                <input
                  type="text"
                  className="form-control"
                  value={rule}
                  onChange={(e) => handleTicketRuleChange(index, e.target.value)}
                  placeholder={`Rule ${index + 1}`}
                />
                {formData.ticketRules.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeTicketRule(index)}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={addTicketRule}
            >
              + Add Rule
            </button>
          </div>
        </div>

        {/* Current Settings Preview */}
        {settings && (
          <div className="card">
            <h3>Current Settings Preview</h3>
            <div className="grid grid-2">
              <div>
                <h4>Company Info</h4>
                <p><strong>Name:</strong> {settings.companyName}</p>
                <p><strong>Address:</strong> {settings.companyAddress}</p>
                <p><strong>Contacts:</strong> {settings.contactNumbers.join(', ')}</p>
                {settings.email && <p><strong>Email:</strong> {settings.email}</p>}
                {settings.panNumber && <p><strong>PAN:</strong> {settings.panNumber}</p>}
              </div>
              <div>
                <h4>System Config</h4>
                <p><strong>Currency:</strong> {settings.defaultCurrency}</p>
                <p><strong>Language:</strong> {settings.defaultLanguage}</p>
                <p><strong>Conversion Rate:</strong> 1 USD = {settings.conversionRate} NPR</p>
                <p><strong>Nepali Date:</strong> {settings.nepaliDateFormat}</p>
              </div>
            </div>
          </div>
        )}
      </form>
      <footer style={{ textAlign: 'center', margin: '32px 0 12px 0', fontSize: '12px', color: '#708090', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={logo} alt="Valyntix Logo" style={{ width: 24, height: 24, verticalAlign: 'middle', borderRadius: 4, objectFit: 'contain' }} />
          &copy; Valyntix AI TECH SYSTEM. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

export default Settings;