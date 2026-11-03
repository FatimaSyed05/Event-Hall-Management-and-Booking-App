import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useContext, createContext } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

interface WebMarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  draggable?: boolean;
  onDragEnd?: (event: any) => void;
}

interface MapComponentProps {
  style?: any;
  region?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  onRegionChangeComplete?: (region: any) => void;
  onPress?: (event: any) => void;
  children?: React.ReactNode;
}

const MapContext = createContext<{ map: any; leaflet: any } | null>(null);

const deltaToZoom = (delta: number) => {
  const zoom = Math.log2(360 / (delta || 0.01));
  return Math.max(3, Math.min(19, Math.round(zoom)));
};

const WebMapComponent = forwardRef<any, MapComponentProps>(
  ({ style, region, onRegionChangeComplete, onPress, children }, ref) => {
    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [leaflet, setLeaflet] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mapInstance, setMapInstance] = useState<any>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (r: any, _duration?: number) => {
        if (mapRef.current) {
          mapRef.current.flyTo([r.latitude, r.longitude], deltaToZoom(r.latitudeDelta), { duration: 0.8 });
        }
      },
    }));

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          if (typeof window === 'undefined') return;
          const L = (await import('leaflet')).default;
          delete (L.Icon.Default.prototype as any)._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          });
          if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
          }
          if (mounted) { setLeaflet(L); setLoading(false); }
        } catch (error) {
          console.error('Leaflet load error:', error);
          if (mounted) setLoading(false);
        }
      })();
      return () => { mounted = false; };
    }, []);

    // Map initialize
    useEffect(() => {
      if (!leaflet || !mapContainerRef.current || mapRef.current) return;

      const map = leaflet.map(mapContainerRef.current, {
        center: region ? [region.latitude, region.longitude] : [31.5204, 74.3587],
        zoom: deltaToZoom(region?.latitudeDelta ?? 0.01),
      });

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      mapRef.current = map;
      setMapInstance(map);   

      map.on('moveend', () => {
        const center = map.getCenter();
        const bounds = map.getBounds();
        onRegionChangeComplete?.({
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: bounds.getNorth() - bounds.getSouth(),
          longitudeDelta: bounds.getEast() - bounds.getWest(),
        });
      });

      map.on('click', (e: any) => {
        onPress?.({
          nativeEvent: { coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng } },
        });
      });

      setTimeout(() => map.invalidateSize(), 200);

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }, [leaflet]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !region) return;
      const c = map.getCenter();
      const moved =
        Math.abs(c.lat - region.latitude) > 0.0005 ||
        Math.abs(c.lng - region.longitude) > 0.0005;
      if (moved) {
        map.flyTo([region.latitude, region.longitude], deltaToZoom(region.latitudeDelta), { duration: 0.6 });
      }
    }, [region]);

    if (loading || !leaflet) {
      return (
        <View style={[style, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#5B21B6" />
        </View>
      );
    }

    return (
      <View style={style}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
        <MapContext.Provider value={{ map: mapInstance, leaflet }}>
          {children}
        </MapContext.Provider>
      </View>
    );
  }
);

export const Marker: React.FC<WebMarkerProps> = ({ coordinate, draggable, onDragEnd }) => {
  const ctx = useContext(MapContext);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!ctx?.map || !ctx?.leaflet || !coordinate) return;

    if (!markerRef.current) {
      markerRef.current = ctx.leaflet
        .marker([coordinate.latitude, coordinate.longitude], { draggable: !!draggable })
        .addTo(ctx.map);

      if (draggable && onDragEnd) {
        markerRef.current.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          onDragEnd({ nativeEvent: { coordinate: { latitude: pos.lat, longitude: pos.lng } } });
        });
      }
    } else {
      markerRef.current.setLatLng([coordinate.latitude, coordinate.longitude]);
    }
  }, [ctx?.map, ctx?.leaflet, coordinate?.latitude, coordinate?.longitude, draggable]);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);

  return null;
};

export const MapComponent = WebMapComponent;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
});