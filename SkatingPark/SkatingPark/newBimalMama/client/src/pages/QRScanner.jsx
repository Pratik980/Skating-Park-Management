import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/api';
import { QrCode, Clock, Users, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/currencyConverter';

function QRScanner() {
  const { currency, dispatch } = useApp();
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanHistory, setScanHistory] = useState([]);

  useEffect(() => {
    fetchScanHistory();
  }, []);

  const fetchScanHistory = async () => {
    try {
      const response = await api.get('/qr/history');
      setScanHistory(response.data);
    } catch (error) {
      console.error('Error fetching scan history:', error);
    }
  };

  const handleQRScan = async (qrData) => {
    setIsLoading(true);
    setScanResult(null);

    try {
      const response = await api.post('/qr/scan', { qrData });
      setScanResult(response.data);
      fetchScanHistory(); // Refresh history
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { 
          id: Date.now(), 
          type: response.data.isExpired ? 'warning' : 'success',
          message: `QR स्क्यान सफल: ${response.data.ticket.names.join(', ')}`
        }
      });
    } catch (error) {
      const message = error.response?.data?.message || 'QR स्क्यान गर्न असफल';
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { id: Date.now(), type: 'error', message }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualScan = () => {
    if (!manualInput.trim()) {
      alert('कृपया QR डाटा प्रविष्ट गर्नुहोस्');
      return;
    }
    handleQRScan(manualInput);
  };

  const extendTime = async (ticketId, minutes) => {
    try {
      await api.post(`/tickets/${ticketId}/extend`, { minutes });
      setScanResult(prev => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          remainingTime: prev.ticket.remainingTime + minutes
        },
        remainingTime: prev.remainingTime + minutes,
        isExpired: false
      } : null);
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { id: Date.now(), type: 'success', message: `${minutes} मिनेट थपियो` }
      });
    } catch (error) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { id: Date.now(), type: 'error', message: 'समय थप्न असफल' }
      });
    }
  };

  const formatTime = (minutes) => {
    if (minutes <= 0) return 'समय सकियो';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} घण्टा ${mins} मिनेट`;
    }
    return `${mins} मिनेट`;
  };

  return (
    <div className="qr-scanner-page-wrapper" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9f4 100%)', padding: '15px 20px', width: '100%', maxWidth: '100%', margin: 0 }}>
      <style>{`
        .qrscanner-wrapper {
          width: 100% !important;
          max-width: 100% !important;
        }
        .main-content {
          margin-left: 250px !important;
          width: calc(100% - 250px) !important;
        }
        .main-content .content-area {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background-color: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        /* Mobile override */
        @media (max-width: 900px) {
          .main-content { margin-left: 0 !important; width: 100% !important; }
          .main-content .content-area { max-width: 720px !important; margin: 12px auto !important; padding: 18px !important; background-color: white !important; border-radius: 10px !important; box-shadow: 0 2px 10px rgba(0,0,0,0.08) !important; }
        }
      `}</style>
      <div className="page-header">
        <p>टिकटहरू स्क्यान गर्नुहोस् र समय जाँच गर्नुहोस्</p>
      </div>

      <div className="grid-2">
        {/* Scanner Interface */}
        <div className="card">
          <div className="card-header">
            <h2>
              <QrCode />
              QR स्क्यानर
            </h2>
          </div>
          <div className="card-content">
            {/* Manual Input */}
            <div className="form-group">
              <label className="form-label">QR डाटा (म्यानुअल प्रविष्टि)</label>
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="form-textarea"
                placeholder="QR कोडबाट डाटा यहाँ पेस्ट गर्नुहोस् वा टाइप गर्नुहोस्..."
                rows="4"
              />
            </div>

            <button
              onClick={handleManualScan}
              disabled={isLoading}
              className="btn btn-primary btn-full"
            >
              <QrCode />
              {isLoading ? 'स्क्यान हुदै...' : 'स्क्यान गर्नुहोस्'}
            </button>

            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: '#f8f9fa', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ marginBottom: '10px', color: '#2c3e50' }}>निर्देशनहरू:</h4>
              <p style={{ fontSize: '14px', color: '#7f8c8d', margin: 0 }}>
                १. QR स्क्यानर उपकरणबाट डाटा यहाँ पेस्ट गर्नुहोस्<br />
                २. वा क्यामेरा स्क्यानर एकीकृत गर्न सकिन्छ<br />
                ३. स्क्यान गरेपछि टिकट जानकारी देखाइनेछ
              </p>
            </div>
          </div>
        </div>

        {/* Scan Result */}
        <div className="card">
          <div className="card-header">
            <h2>स्क्यान नतिजा</h2>
          </div>
          <div className="card-content">
            {isLoading ? (
              <div className="text-center" style={{ padding: '40px' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '15px', color: '#7f8c8d' }}>स्क्यान हुदैछ...</p>
              </div>
            ) : scanResult ? (
              <div>
                <div style={{
                  background: scanResult.isExpired ? '#fdebd0' : '#d5f4e6',
                  border: `2px solid ${scanResult.isExpired ? '#f39c12' : '#27ae60'}`,
                  borderRadius: '10px',
                  padding: '20px',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  {scanResult.isExpired ? (
                    <AlertTriangle size={48} style={{ color: '#27ae60', marginBottom: '10px' }} />
                  ) : (
                    <CheckCircle size={48} style={{ color: '#27ae60', marginBottom: '10px' }} />
                  )}
                  
                  <h3 style={{ 
                    color: scanResult.isExpired ? '#27ae60' : '#27ae60',
                    marginBottom: '10px'
                  }}>
                    {scanResult.isExpired ? 'समय सकियो' : 'सक्रिय टिकट'}
                  </h3>
                  
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
                    {scanResult.ticket.names.join(', ')}
                  </div>
                  
                  <div style={{ fontSize: '18px', color: '#7f8c8d', marginBottom: '15px' }}>
                    बाँकी समय: {formatTime(scanResult.remainingTime)}
                  </div>

                  {scanResult.isExpired && (
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => extendTime(scanResult.ticket._id, 5)}
                        className="btn btn-warning"
                      >
                        +5 मिनेट
                      </button>
                      <button
                        onClick={() => extendTime(scanResult.ticket._id, 10)}
                        className="btn btn-warning"
                      >
                        +10 मिनेट
                      </button>
                      <button
                        onClick={() => extendTime(scanResult.ticket._id, 15)}
                        className="btn btn-warning"
                      >
                        +15 मिनेट
                      </button>
                    </div>
                  )}
                </div>

                {/* Ticket Details */}
                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '15px', color: '#2c3e50' }}>टिकट विवरण:</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <strong>टिकट नं.:</strong>
                      <div>#{scanResult.ticket.ticketId.toString().padStart(2, '0')}</div>
                    </div>
                    <div>
                      <strong>प्रकार:</strong>
                      <div>{scanResult.ticket.type}</div>
                    </div>
                    <div>
                      <strong>मिति:</strong>
                      <div>{scanResult.ticket.nepaliDate}</div>
                    </div>
                    <div>
                      <strong>मूल्य:</strong>
                      <div>{formatCurrency(scanResult.ticket.price, currency)}</div>
                    </div>
                    <div>
                      <strong>अवधि:</strong>
                      <div>{scanResult.ticket.duration} मिनेट</div>
                    </div>
                    <div>
                      <strong>प्रवेश समय:</strong>
                      <div>{new Date(scanResult.ticket.entryTime).toLocaleTimeString('ne-NP')}</div>
                    </div>
                  </div>

                  {scanResult.ticket.remarks && (
                    <div style={{ marginTop: '10px' }}>
                      <strong>टिप्पणी:</strong>
                      <div style={{ color: '#7f8c8d' }}>{scanResult.ticket.remarks}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center" style={{ padding: '40px', color: '#7f8c8d' }}>
                <QrCode size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                <p>कुनै स्क्यान नतिजा छैन</p>
                <p style={{ fontSize: '14px' }}>QR स्क्यान गर्नुहोस् वा डाटा प्रविष्ट गर्नुहोस्</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scan History */}
      <div className="card mt-3">
        <div className="card-header">
          <h2>स्क्यान इतिहास</h2>
        </div>
        <div className="card-content">
          {scanHistory.length > 0 ? (
            <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>टिकट नं.</th>
                    <th>नामहरू</th>
                    <th>प्रकार</th>
                    <th>स्क्यान गर्ने</th>
                    <th className="text-right">बाँकी समय</th>
                    <th className="text-right">स्क्यान मिति</th>
                  </tr>
                </thead>
                <tbody>
                  {scanHistory.map((scan, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: '600' }}>
                        #{scan.ticketId.toString().padStart(2, '0')}
                      </td>
                      <td>
                        {scan.names.slice(0, 2).join(', ')}
                        {scan.names.length > 2 && ` +${scan.names.length - 2}`}
                      </td>
                      <td>
                        <span style={{
                          background: '#d6eaf8',
                          color: '#2c3e50',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {scan.type}
                        </span>
                      </td>
                      <td>{scan.scannedBy}</td>
                      <td className="text-right">
                        <span style={{
                          color: scan.remainingTime <= 0 ? '#14532d' : 
                                 scan.remainingTime <= 10 ? '#f39c12' : '#27ae60',
                          fontWeight: '600'
                        }}>
                          {formatTime(scan.remainingTime)}
                        </span>
                      </td>
                      <td className="text-right" style={{ color: '#7f8c8d', fontSize: '12px' }}>
                        {new Date(scan.scannedAt).toLocaleString('ne-NP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center" style={{ padding: '40px', color: '#7f8c8d' }}>
              <Calendar size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
              <p>कुनै स्क्यान इतिहास छैन</p>
              <p style={{ fontSize: '14px' }}>पहिलो QR स्क्यान गरेपछि इतिहास देखाइनेछ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QRScanner;