import { useMemo, useState } from "react";
import {
  Image,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "@/components/AppButton";
import { IconButton } from "@/components/IconButton";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useTodos } from "@/context/TodoContext";
import type { AppStackParamList } from "@/navigation/types";
import { colors, radius, spacing, typography } from "@/theme";
import type { TodoLocation } from "@/types/todo";

type Props = NativeStackScreenProps<AppStackParamList, "MapPicker">;

type Coordinate = {
  latitude: number;
  longitude: number;
};

type MapSize = {
  width: number;
  height: number;
};

const TILE_SIZE = 256;
const DEFAULT_ZOOM = 13;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
const TILE_SUBDOMAINS = ["a", "b", "c", "d"];
const TILE_STYLE = "light_all";
const TILE_ATTRIBUTION = "© OpenStreetMap contributors © CARTO";
const FALLBACK_COORDINATE = {
  latitude: 12.9716,
  longitude: 77.5946
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function coordinateToPixel(coordinate: Coordinate, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLatitude = Math.sin((coordinate.latitude * Math.PI) / 180);

  return {
    x: ((coordinate.longitude + 180) / 360) * scale,
    y:
      (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
      scale
  };
}

function pixelToCoordinate(x: number, y: number, zoom: number): Coordinate {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const mercatorY = 0.5 - y / scale;
  const latitude = 90 - (360 * Math.atan(Math.exp(-mercatorY * 2 * Math.PI))) / Math.PI;

  return {
    latitude: clamp(latitude, -85, 85),
    longitude: clamp(longitude, -180, 180)
  };
}

function getTileUrl(x: number, y: number, zoom: number) {
  const tileCount = 2 ** zoom;
  const wrappedX = ((x % tileCount) + tileCount) % tileCount;
  const subdomain = TILE_SUBDOMAINS[Math.abs(x + y) % TILE_SUBDOMAINS.length];

  return `https://${subdomain}.basemaps.cartocdn.com/${TILE_STYLE}/${zoom}/${wrappedX}/${y}.png`;
}

export function MapLocationPickerScreen({ navigation, route }: Props) {
  const { setPendingLocation } = useTodos();
  const initialLocation = route.params?.initialLocation;

  const initialCoordinate = useMemo(
    () => ({
      latitude: initialLocation?.latitude ?? FALLBACK_COORDINATE.latitude,
      longitude: initialLocation?.longitude ?? FALLBACK_COORDINATE.longitude
    }),
    [initialLocation]
  );

  const [selected, setSelected] = useState<Coordinate>(initialCoordinate);
  const [center, setCenter] = useState<Coordinate>(initialCoordinate);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [mapSize, setMapSize] = useState<MapSize>({ width: 0, height: 0 });
  const [radiusMeters, setRadiusMeters] = useState(String(initialLocation?.radius ?? 150));
  const [label, setLabel] = useState(initialLocation?.label ?? "");
  const [error, setError] = useState("");

  const tiles = useMemo(() => {
    if (!mapSize.width || !mapSize.height) {
      return [];
    }

    const centerPixel = coordinateToPixel(center, zoom);
    const left = centerPixel.x - mapSize.width / 2;
    const top = centerPixel.y - mapSize.height / 2;
    const minTileX = Math.floor(left / TILE_SIZE);
    const maxTileX = Math.floor((left + mapSize.width) / TILE_SIZE);
    const minTileY = clamp(Math.floor(top / TILE_SIZE), 0, 2 ** zoom - 1);
    const maxTileY = clamp(Math.floor((top + mapSize.height) / TILE_SIZE), 0, 2 ** zoom - 1);
    const nextTiles: { id: string; left: number; top: number; uri: string }[] = [];

    for (let x = minTileX; x <= maxTileX; x += 1) {
      for (let y = minTileY; y <= maxTileY; y += 1) {
        nextTiles.push({
          id: `${zoom}-${x}-${y}`,
          left: x * TILE_SIZE - left,
          top: y * TILE_SIZE - top,
          uri: getTileUrl(x, y, zoom)
        });
      }
    }

    return nextTiles;
  }, [center, mapSize.height, mapSize.width, zoom]);

  const selectedPosition = useMemo(() => {
    if (!mapSize.width || !mapSize.height) {
      return null;
    }

    const centerPixel = coordinateToPixel(center, zoom);
    const selectedPixel = coordinateToPixel(selected, zoom);

    return {
      left: selectedPixel.x - (centerPixel.x - mapSize.width / 2),
      top: selectedPixel.y - (centerPixel.y - mapSize.height / 2)
    };
  }, [center, mapSize.height, mapSize.width, selected, zoom]);

  const onMapLayout = (event: LayoutChangeEvent) => {
    setMapSize({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height
    });
  };

  const onMapPress = (event: GestureResponderEvent) => {
    if (!mapSize.width || !mapSize.height) {
      return;
    }

    const centerPixel = coordinateToPixel(center, zoom);
    const left = centerPixel.x - mapSize.width / 2;
    const top = centerPixel.y - mapSize.height / 2;
    const nextSelected = pixelToCoordinate(
      left + event.nativeEvent.locationX,
      top + event.nativeEvent.locationY,
      zoom
    );

    setSelected(nextSelected);
    setCenter(nextSelected);
    setError("");
  };

  const pan = (latitudeDelta: number, longitudeDelta: number) => {
    setCenter((current) => ({
      latitude: clamp(current.latitude + latitudeDelta, -85, 85),
      longitude: clamp(current.longitude + longitudeDelta, -180, 180)
    }));
  };

  const useBrowserLocation = () => {
    if (!navigator.geolocation) {
      setError("Browser location is not available.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setSelected(coordinate);
        setCenter(coordinate);
        setError("");
      },
      () => setError("Browser location permission was not granted."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const confirm = () => {
    const radiusValue = Number(radiusMeters);

    if (!Number.isFinite(radiusValue) || radiusValue < 100 || radiusValue > 1000) {
      setError("Radius must be between 100 and 1000 meters.");
      return;
    }

    const location: TodoLocation = {
      latitude: selected.latitude,
      longitude: selected.longitude,
      radius: radiusValue,
      label: label.trim() || undefined
    };

    setPendingLocation(location);
    navigation.goBack();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Pick location</Text>
        <Text style={styles.subtitle}>Select a place for this todo reminder.</Text>
      </View>

      <View style={styles.mapShell}>
        <Pressable onLayout={onMapLayout} onPress={onMapPress} style={styles.map}>
          {tiles.map((tile) => (
            <Image
              key={tile.id}
              source={{ uri: tile.uri }}
              style={[styles.tile, { left: tile.left, top: tile.top }]}
            />
          ))}
          {selectedPosition ? (
            <View
              pointerEvents="none"
              style={[
                styles.marker,
                {
                  left: selectedPosition.left - 13,
                  top: selectedPosition.top - 34
                }
              ]}
            >
              <View style={styles.markerPin} />
              <View style={styles.markerPoint} />
            </View>
          ) : null}
          <Text style={styles.attribution}>{TILE_ATTRIBUTION}</Text>
        </Pressable>

        <View style={styles.mapControls}>
          <IconButton icon="locate-outline" label="Use current location" onPress={useBrowserLocation} />
          <IconButton icon="add" label="Zoom in" onPress={() => setZoom((value) => Math.min(MAX_ZOOM, value + 1))} />
          <IconButton icon="remove" label="Zoom out" onPress={() => setZoom((value) => Math.max(MIN_ZOOM, value - 1))} />
        </View>

        <View style={styles.panControls}>
          <IconButton icon="chevron-up" label="Pan north" onPress={() => pan(0.03, 0)} />
          <View style={styles.panMiddle}>
            <IconButton icon="chevron-back" label="Pan west" onPress={() => pan(0, -0.03)} />
            <IconButton icon="chevron-forward" label="Pan east" onPress={() => pan(0, 0.03)} />
          </View>
          <IconButton icon="chevron-down" label="Pan south" onPress={() => pan(-0.03, 0)} />
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.coords}>
          <Text style={styles.coordText}>{selected.latitude.toFixed(5)}</Text>
          <Text style={styles.coordText}>{selected.longitude.toFixed(5)}</Text>
        </View>

        <TextField
          keyboardType="numeric"
          label="Radius meters"
          onChangeText={setRadiusMeters}
          placeholder="150"
          value={radiusMeters}
        />
        <TextField
          label="Label"
          onChangeText={setLabel}
          placeholder="Office, home, store"
          value={label}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton icon="checkmark" onPress={confirm} title="Use this location" />
        <AppButton icon="arrow-back" onPress={() => navigation.goBack()} title="Cancel" variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    gap: spacing.sm
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24
  },
  mapShell: {
    height: 380,
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.surface
  },
  map: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#1B2433"
  },
  tile: {
    position: "absolute",
    width: TILE_SIZE,
    height: TILE_SIZE
  },
  marker: {
    position: "absolute",
    width: 26,
    height: 36,
    alignItems: "center"
  },
  markerPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white
  },
  markerPoint: {
    width: 10,
    height: 10,
    marginTop: -4,
    backgroundColor: colors.primary,
    transform: [{ rotate: "45deg" }]
  },
  attribution: {
    position: "absolute",
    right: spacing.xs,
    bottom: spacing.xs,
    color: "#172033",
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    overflow: "hidden",
    fontSize: typography.tiny,
    fontWeight: "700"
  },
  mapControls: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    gap: spacing.sm
  },
  panControls: {
    position: "absolute",
    left: spacing.sm,
    bottom: spacing.sm,
    alignItems: "center",
    gap: spacing.xs
  },
  panMiddle: {
    flexDirection: "row",
    gap: spacing.xs
  },
  panel: {
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  coords: {
    flexDirection: "row",
    gap: spacing.sm
  },
  coordText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
    borderRadius: radius.md,
    backgroundColor: colors.input,
    padding: spacing.md,
    overflow: "hidden"
  },
  error: {
    color: colors.danger,
    lineHeight: 20
  }
});
