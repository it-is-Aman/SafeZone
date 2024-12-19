import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const navigate = useNavigate();
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [emergencyName, setEmergencyName] = useState('');

  useEffect(() => {
    // Check for active SOS alerts when component mounts
    checkActiveAlerts();
  }, []);

  const checkActiveAlerts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/sos/active', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data && response.data.length > 0) {
        setSosActive(true);
      }
    } catch (error) {
      console.error('Error checking active alerts:', error);
    }
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      const handlePermissionDenied = () => {
        toast.error('Location permission is required for SOS functionality. Please enable location access in your browser settings.');
        reject(new Error('Location permission denied'));
      };

      navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
        if (permissionStatus.state === 'denied') {
          handlePermissionDenied();
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              handlePermissionDenied();
            } else {
              toast.error('Error getting location. Please try again.');
              reject(error);
            }
          },
          options
        );
      });
    });
  };

  const handleSOS = async () => {
    if (sosActive) {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/sos/active', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.data && response.data.length > 0) {
          await axios.patch(
            `http://localhost:5000/api/sos/resolve/${response.data[0]._id}`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          setSosActive(false);
          toast.success('SOS alert resolved');
        }
      } catch (error) {
        toast.error('Error resolving SOS alert');
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        const location = await getLocation();
        await axios.post(
          'http://localhost:5000/api/sos/trigger',
          location,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        setSosActive(true);
        toast.success('SOS alert triggered successfully');
      } catch (error) {
        toast.error(error.message || 'Error triggering SOS alert');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEmergencyContactSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('/api/user/emergency-contact', {
        emergencyEmail,
        emergencyName
      });

      if (response.data.success) {
        toast.success('Emergency contact updated successfully');
      }
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      toast.error('Failed to update emergency contact');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Welcome to SafeZone, {user?.name}
        </h1>

        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden p-6 space-y-6">
          <div className="text-center">
            <button
              onClick={handleSOS}
              disabled={loading}
              className={`w-48 h-48 rounded-full focus:outline-none focus:ring-4 focus:ring-red-300 ${
                sosActive
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              } text-white font-bold text-xl transition-colors duration-200 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                'Processing...'
              ) : sosActive ? (
                'RESOLVE SOS'
              ) : (
                'SOS'
              )}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            {sosActive ? (
              <p className="text-green-600 font-semibold">
                SOS is active. Emergency contacts have been notified.
              </p>
            ) : (
              <p>Press the SOS button in case of emergency</p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/trip-monitor')}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Start Trip
              </button>
              <button
                onClick={() => navigate('/safety-map')}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                View Safety Map
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="emergency-contact-section">
        <h2>Emergency Contact Information</h2>
        <form onSubmit={handleEmergencyContactSubmit}>
          <div className="form-group">
            <label>Emergency Contact Name</label>
            <input
              type="text"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Emergency Contact Email</label>
            <input
              type="email"
              value={emergencyEmail}
              onChange={(e) => setEmergencyEmail(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="submit-button">
            Save Emergency Contact
          </button>
        </form>
      </div>
    </div>
  );
};

export default Home;