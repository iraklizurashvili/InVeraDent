// js/map.js — Interactive Leaflet map with browser geolocation
import L from 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/+esm';

const CLINIC = {
  lat:     41.7025,
  lng:     44.7880,
  name:    'In Vera Dent',
  address: 'ვ. ბარნოვის ქ. 24, თბილისი',
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180)
             * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function makeIcon(html, size, anchor) {
  return L.divIcon({
    className: '',
    html,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -(anchor[1] + 4)],
  });
}

export function initMap() {
  const mapEl = document.getElementById('clinicMap');
  if (!mapEl) return;

  const map = L.map('clinicMap', { zoomControl: true }).setView([CLINIC.lat, CLINIC.lng], 15);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  const clinicIcon = makeIcon(`<div class="map-pin map-pin--clinic">🦷</div>`, [48, 48], [24, 48]);
  L.marker([CLINIC.lat, CLINIC.lng], { icon: clinicIcon })
    .addTo(map)
    .bindPopup(`<strong>${CLINIC.name}</strong><br>${CLINIC.address}`)
    .openPopup();

  const distanceBadge = document.getElementById('mapDistance');
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const { latitude: lat, longitude: lng } = coords;

      const userIcon = makeIcon(`<div class="map-pin map-pin--user">📍</div>`, [36, 36], [18, 36]);
      L.marker([lat, lng], { icon: userIcon }).addTo(map).bindPopup('თქვენი მდებარეობა');

      L.polyline([[lat, lng], [CLINIC.lat, CLINIC.lng]], {
        color: '#2dd4bf', weight: 2, dashArray: '8 6', opacity: 0.85,
      }).addTo(map);

      map.fitBounds([[lat, lng], [CLINIC.lat, CLINIC.lng]], { padding: [60, 60] });

      const km = haversineKm(lat, lng, CLINIC.lat, CLINIC.lng).toFixed(1);
      if (distanceBadge) {
        distanceBadge.textContent = `📍 თქვენ კლინიკიდან ${km} კმ-ში ხართ`;
        distanceBadge.hidden = false;
      }
    },
    () => {
      if (distanceBadge) {
        distanceBadge.textContent = '📍 გეოლოკაციის ნებართვა საჭიროა';
        distanceBadge.hidden = false;
      }
    }
  );
}
