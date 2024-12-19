import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'leaflet/dist/leaflet.css';

const customIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const TripMonitor = () => {
  const [activeTrip, setActiveTrip] = useState(null);
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState(null);
  const [expectedDuration, setExpectedDuration] = useState('');

  useEffect(() => {
    checkActiveTrip();
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const checkActiveTrip = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/trip/active');
      if (response.data) {
        setActiveTrip(response.data);
        setStartLocation({
          latitude: response.data.startLocation.latitude,
          longitude: response.data.startLocation.longitude
        });
        setEndLocation({
          latitude: response.data.endLocation.latitude,
          longitude: response.data.endLocation.longitude
        });
        startLocationTracking();
      }
    } catch (error) {
      console.error('Error checking active trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return null;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        updateTripLocation(latitude, longitude);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location permission is required for trip monitoring');
        } else {
          toast.error('Error tracking location: ' + error.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
    setWatchId(id);
    return id;
  };

  const updateTripLocation = async (latitude, longitude) => {
    if (activeTrip) {
      try {
        await axios.patch(`http://localhost:5000/api/trip/update-location/${activeTrip._id}`, {
          latitude,
          longitude
        });
      } catch (error) {
        console.error('Error updating trip location:', error);
      }
    }
  };

  const startTrip = async () => {
    try {
      if (!startLocation || !endLocation || !expectedDuration) {
        toast.error('Please fill in all trip details');
        return;
      }

      const expectedEndTime = new Date(Date.now() + parseFloat(expectedDuration) * 60 * 60 * 1000);

      const response = await axios.post('http://localhost:5000/api/trip/start', {
        startLocation,
        endLocation,
        expectedEndTime
      });

      setActiveTrip(response.data.trip);
      startLocationTracking();
      toast.success('Trip started successfully');
    } catch (error) {
      toast.error('Error starting trip');
    }
  };

  const completeTrip = async () => {
    try {
      await axios.patch(`http://localhost:5000/api/trip/complete/${activeTrip._id}`);
      setActiveTrip(null);
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      toast.success('Trip completed successfully');
    } catch (error) {
      toast.error('Error completing trip');
    }
  };

  const handleLocationSelect = (type) => {
    return new Promise((resolve, reject) => {
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
            const location = { latitude, longitude };
            if (type === 'start') {
              setStartLocation(location);
            } else {
              setEndLocation(location);
            }
            resolve(location);
          },
          (error) => {
            toast.error('Error getting location: ' + error.message);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Trip Monitor</h1>

      {!activeTrip ? (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Start New Trip</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Location
              </label>
              <button
                onClick={() => handleLocationSelect('start')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
              >
                Use Current Location
              </button>
              {startLocation && (
                <p className="mt-2 text-sm text-gray-600">
                  Lat: {startLocation.latitude.toFixed(6)}, Long:{' '}
                  {startLocation.longitude.toFixed(6)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination
              </label>
              <button
                onClick={() => handleLocationSelect('end')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
              >
                Use Current Location
              </button>
              {endLocation && (
                <p className="mt-2 text-sm text-gray-600">
                  Lat: {endLocation.latitude.toFixed(6)}, Long:{' '}
                  {endLocation.longitude.toFixed(6)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Duration (hours)
              </label>
              <input
                type="number"
                step="0.5"
                value={expectedDuration}
                onChange={(e) => setExpectedDuration(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <button
              onClick={startTrip}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              Start Trip
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Trip</h2>
          <div className="space-y-4">
            <p>
              <strong>Status:</strong> {activeTrip.status}
            </p>
            <p>
              <strong>Started:</strong>{' '}
              {new Date(activeTrip.startTime).toLocaleString()}
            </p>
            <p>
              <strong>Expected Arrival:</strong>{' '}
              {new Date(activeTrip.expectedEndTime).toLocaleString()}
            </p>
            <button
              onClick={completeTrip}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Complete Trip
            </button>
          </div>
        </div>
      )}

      {(startLocation || activeTrip) && (
        <div className="h-[400px] rounded-lg overflow-hidden shadow-lg">
          <MapContainer
            center={[
              currentLocation?.latitude || startLocation?.latitude,
              currentLocation?.longitude || startLocation?.longitude
            ]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {startLocation && (
              <Marker
                position={[startLocation.latitude, startLocation.longitude]}
                icon={customIcon}
              >
                <Popup>Start Location</Popup>
              </Marker>
            )}

            {endLocation && (
              <Marker 
                position={[endLocation.latitude, endLocation.longitude]}
                icon={customIcon}
              >
                <Popup>Destination</Popup>
              </Marker>
            )}

            {currentLocation && (
              <Marker
                position={[currentLocation.latitude, currentLocation.longitude]}
                icon={customIcon}
              >
                <Popup>Current Location</Popup>
              </Marker>
            )}

            {startLocation && endLocation && (
              <Polyline
                positions={[
                  [startLocation.latitude, startLocation.longitude],
                  [endLocation.latitude, endLocation.longitude]
                ]}
                color="purple"
              />
            )}
          </MapContainer>
        </div>
      )}
    </div>
  );
};

export default TripMonitor; 