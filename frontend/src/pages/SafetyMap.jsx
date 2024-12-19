import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Add custom marker icon
const customIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const SafetyMap = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newReport, setNewReport] = useState({
    category: 'harassment',
    description: '',
    severity: 'medium'
  });
  const [showReportForm, setShowReportForm] = useState(false);
  const [hasEmergencyContact, setHasEmergencyContact] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const initializeMap = () => {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser');
        return;
      }

      navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
        if (permissionStatus.state === 'denied') {
          toast.error('Location permission is required. Please enable location access in your browser settings.');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
            fetchNearbyReports(latitude, longitude);
          },
          (error) => {
            toast.error('Error getting location: ' + error.message);
            setLoading(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });
    };

    initializeMap();
  }, []);

  useEffect(() => {
    const checkEmergencyContact = async () => {
      try {
        const response = await axios.get('/api/user/emergency-contact');
        const hasContact = response.data?.emergencyContacts?.length > 0;
        setHasEmergencyContact(hasContact);
        
        if (!hasContact) {
          toast.warning('Please add emergency contacts in your profile to enable SOS');
        }
      } catch (error) {
        console.error('Error checking emergency contact:', error);
        setHasEmergencyContact(false);
      } finally {
        setLoading(false);
      }
    };

    checkEmergencyContact();
  }, []);

  const fetchNearbyReports = async (latitude, longitude) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/report/nearby?latitude=${latitude}&longitude=${longitude}&radius=5000`
      );
      setReports(response.data);
    } catch (error) {
      toast.error('Error fetching safety reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!userLocation) {
      toast.error('Location not available');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/report/submit', {
        ...newReport,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      });

      toast.success('Safety report submitted successfully');
      setReports([...reports, response.data.report]);
      setShowReportForm(false);
      setNewReport({
        category: 'harassment',
        description: '',
        severity: 'medium'
      });
    } catch (error) {
      toast.error('Error submitting report');
    }
  };

  const handleSOS = async () => {
    if (!hasEmergencyContact) {
      toast.error('Please add emergency contacts first');
      navigate('/profile');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    try {
      setSending(true);
      
      // Get current position
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      // Send SOS alert
      const response = await axios.post('/api/sos/trigger', {
        location,
        userId: user._id
      });

      if (response.data.success) {
        toast.success('SOS alert sent successfully to your emergency contacts');
      } else {
        throw new Error(response.data.message || 'Failed to send SOS alert');
      }
    } catch (error) {
      console.error('SOS error:', error);
      toast.error(error.message || 'Failed to send SOS alert');
    } finally {
      setSending(false);
    }
  };

  if (loading || !userLocation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Safety Map</h1>
        <button
          onClick={() => setShowReportForm(!showReportForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          {showReportForm ? 'Cancel Report' : 'Report Unsafe Area'}
        </button>
      </div>

      {showReportForm && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Submit Safety Report</h2>
          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={newReport.category}
                onChange={(e) =>
                  setNewReport({ ...newReport, category: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="harassment">Harassment</option>
                <option value="darkArea">Dark Area</option>
                <option value="unsafeZone">Unsafe Zone</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={newReport.description}
                onChange={(e) =>
                  setNewReport({ ...newReport, description: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                rows="3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Severity
              </label>
              <select
                value={newReport.severity}
                onChange={(e) =>
                  setNewReport({ ...newReport, severity: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              Submit Report
            </button>
          </form>
        </div>
      )}

      <div className="h-[600px] rounded-lg overflow-hidden shadow-lg">
        {userLocation && (
          <MapContainer
            center={[userLocation.latitude, userLocation.longitude]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <Marker 
              position={[userLocation.latitude, userLocation.longitude]}
              icon={customIcon}
            >
              <Popup>Your Location</Popup>
            </Marker>

            {reports.map((report) => (
              <Marker
                key={report._id}
                position={[report.location.latitude, report.location.longitude]}
                icon={customIcon}
              >
                <Popup>
                  <div>
                    <h3 className="font-bold">{report.category}</h3>
                    <p className="text-sm">{report.description}</p>
                    <p className="text-xs text-gray-500">
                      Severity: {report.severity}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={handleSOS}
          disabled={!hasEmergencyContact || sending}
          className={`
            w-20 h-20 rounded-full text-white font-bold text-xl
            ${sending ? 'bg-yellow-500' : 'bg-red-600 hover:bg-red-700'}
            ${!hasEmergencyContact ? 'opacity-50 cursor-not-allowed' : 'animate-pulse'}
            transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-300
          `}
        >
          {sending ? 'Sending...' : 'SOS'}
        </button>
        
        {!hasEmergencyContact && (
          <div className="mt-2 text-sm text-red-600 bg-white p-2 rounded shadow">
            Add emergency contacts to enable SOS
          </div>
        )}
      </div>
    </div>
  );
};

export default SafetyMap; 