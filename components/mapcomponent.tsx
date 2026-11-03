// components/MapComponent.tsx
import React, { forwardRef } from 'react';
import MapView, { Region, Marker as MapMarker, MapPressEvent } from 'react-native-maps';
import { StyleSheet } from 'react-native';

interface MapComponentProps {
  region?: Region;
  onRegionChangeComplete?: (region: Region) => void;
  onPress?: (event: MapPressEvent) => void;
  style?: any;
  children?: React.ReactNode; 
}

export const MapComponent = forwardRef<MapView, MapComponentProps>(
  ({ region, onRegionChangeComplete, onPress, style, children }, ref) => {
    const defaultRegion: Region = {
      latitude: 31.5204,
      longitude: 74.3587,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };

    const handlePress = (event: MapPressEvent) => {
      console.log("📍 Map tapped at:", event.nativeEvent.coordinate); 
      if (onPress) {
        onPress(event);
      }
    };

    return (
       <MapView
        ref={ref}
        style={[styles.map, style]}
        region={region || defaultRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={handlePress} 
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {children}  
      </MapView>
    );
  }
);

export const Marker = MapMarker;

const styles = StyleSheet.create({
  map: { 
    width: '100%', 
    height: '100%' 
  },
});