import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import MapView, {
  Circle,
  Marker,
  PROVIDER_GOOGLE,
  type MapPressEvent,
  type Region
} from "react-native-maps";

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

type PlacePrediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type PlacesAutocompleteResponse = {
  error_message?: string;
  predictions?: PlacePrediction[];
  status: string;
};

type PlaceDetailsResponse = {
  error_message?: string;
  result?: {
    formatted_address?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
    name?: string;
  };
  status: string;
};

const FALLBACK_COORDINATE = {
  latitude: 12.9716,
  longitude: 77.5946
};
const DEFAULT_DELTA = {
  latitudeDelta: 0.012,
  longitudeDelta: 0.012
};
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
const HAS_GOOGLE_MAPS_KEY = GOOGLE_MAPS_API_KEY.startsWith("AIza");

function toRegion(coordinate: Coordinate, delta: Partial<Region> = {}): Region {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta: delta.latitudeDelta ?? DEFAULT_DELTA.latitudeDelta,
    longitudeDelta: delta.longitudeDelta ?? DEFAULT_DELTA.longitudeDelta
  };
}

function getPlaceTitle(place: PlacePrediction) {
  return place.structured_formatting?.main_text ?? place.description;
}

function getPlaceSubtitle(place: PlacePrediction) {
  return place.structured_formatting?.secondary_text;
}

export function MapLocationPickerScreen({ navigation, route }: Props) {
  const { setPendingLocation } = useTodos();
  const mapRef = useRef<MapView | null>(null);
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
  const [region, setRegion] = useState<Region>(() => toRegion(initialCoordinate));
  const [radiusMeters, setRadiusMeters] = useState(String(initialLocation?.radius ?? 150));
  const [label, setLabel] = useState(initialLocation?.label ?? "");
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [error, setError] = useState("");

  const radiusValue = Number(radiusMeters);
  const previewRadius = Number.isFinite(radiusValue) ? Math.max(100, Math.min(1000, radiusValue)) : 150;

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || !HAS_GOOGLE_MAPS_KEY) {
      setPlaces([]);
      setSearchError("");
      setSearching(false);
      return;
    }

    let active = true;
    const timeout = setTimeout(() => {
      setSearching(true);
      const params = new URLSearchParams({
        input: trimmed,
        key: GOOGLE_MAPS_API_KEY,
        location: `${center.latitude},${center.longitude}`,
        radius: "50000"
      });

      fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`)
        .then((response) => response.json() as Promise<PlacesAutocompleteResponse>)
        .then((data) => {
          if (!active) {
            return;
          }

          if (data.status === "OK") {
            setPlaces(data.predictions ?? []);
            setSearchError("");
            return;
          }

          setPlaces([]);
          setSearchError(
            data.status === "ZERO_RESULTS"
              ? "No places found."
              : data.error_message ?? "Place search is unavailable. Check the Google Places API setup."
          );
        })
        .catch(() => {
          if (active) {
            setPlaces([]);
            setSearchError("Unable to search places right now.");
          }
        })
        .finally(() => {
          if (active) {
            setSearching(false);
          }
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [center.latitude, center.longitude, query]);

  const moveToCoordinate = (coordinate: Coordinate, nextLabel?: string) => {
    const nextRegion = toRegion(coordinate, {
      latitudeDelta: Math.min(region.latitudeDelta, DEFAULT_DELTA.latitudeDelta),
      longitudeDelta: Math.min(region.longitudeDelta, DEFAULT_DELTA.longitudeDelta)
    });

    setSelected(coordinate);
    setCenter(coordinate);
    setRegion(nextRegion);
    setError("");

    if (nextLabel) {
      setLabel(nextLabel);
    }

    mapRef.current?.animateToRegion(nextRegion, 450);
  };

  const useDeviceLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setError("Location permission was not granted.");
      return;
    }

    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      moveToCoordinate({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      });
    } catch {
      setError("Unable to read current location.");
    }
  };

  const selectPlace = async (place: PlacePrediction) => {
    Keyboard.dismiss();
    setQuery(place.description);
    setPlaces([]);
    setSearchError("");
    setSearching(true);

    try {
      const params = new URLSearchParams({
        fields: "geometry,name,formatted_address",
        key: GOOGLE_MAPS_API_KEY,
        place_id: place.place_id
      });
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`);
      const data = (await response.json()) as PlaceDetailsResponse;
      const location = data.result?.geometry?.location;

      if (data.status !== "OK" || !location) {
        setSearchError(data.error_message ?? "Unable to open this place.");
        return;
      }

      moveToCoordinate(
        {
          latitude: location.lat,
          longitude: location.lng
        },
        data.result?.name ?? getPlaceTitle(place)
      );
    } catch {
      setSearchError("Unable to open this place.");
    } finally {
      setSearching(false);
    }
  };

  const onMapPress = (event: MapPressEvent) => {
    moveToCoordinate(event.nativeEvent.coordinate);
    setPlaces([]);
  };

  const confirm = () => {
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
    <Screen padded={false} scroll={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Pick location</Text>
            <Text style={styles.subtitle}>Search, tap, or drag the pin.</Text>
          </View>
          <IconButton icon="locate-outline" label="Use current location" onPress={() => void useDeviceLocation()} />
        </View>

        <View style={styles.mapShell}>
          {HAS_GOOGLE_MAPS_KEY ? (
            <MapView
              ref={mapRef}
              initialRegion={region}
              mapType="standard"
              onPress={onMapPress}
              onRegionChangeComplete={(nextRegion) => {
                setCenter({
                  latitude: nextRegion.latitude,
                  longitude: nextRegion.longitude
                });
                setRegion(nextRegion);
              }}
              provider={PROVIDER_GOOGLE}
              showsCompass
              showsMyLocationButton={false}
              showsUserLocation
              style={styles.map}
            >
              <Circle
                center={selected}
                fillColor="rgba(50, 107, 255, 0.14)"
                radius={previewRadius}
                strokeColor="rgba(50, 107, 255, 0.7)"
                strokeWidth={2}
              />
              <Marker
                coordinate={selected}
                draggable
                onDragEnd={(event) => moveToCoordinate(event.nativeEvent.coordinate)}
                tracksViewChanges={false}
              />
            </MapView>
          ) : (
            <View style={styles.mapKeyState}>
              <Ionicons name="key-outline" size={34} color={colors.primary} />
              <Text style={styles.mapKeyTitle}>Google Maps key needed</Text>
              <Text style={styles.mapKeyText}>
                Add a valid EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, enable Maps SDK for Android and Places API,
                then rebuild the app.
              </Text>
            </View>
          )}

          <View style={styles.searchPanel}>
            <View style={styles.searchInputRow}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={HAS_GOOGLE_MAPS_KEY}
                onChangeText={setQuery}
                placeholder={HAS_GOOGLE_MAPS_KEY ? "Search place" : "Add Google Maps key to search"}
                placeholderTextColor={colors.textSubtle}
                returnKeyType="search"
                style={styles.searchInput}
                value={query}
              />
              {searching ? <ActivityIndicator color={colors.primary} size="small" /> : null}
              {query ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setQuery("");
                    setPlaces([]);
                    setSearchError("");
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {places.length > 0 ? (
              <View style={styles.results}>
                {places.slice(0, 5).map((place) => (
                  <Pressable
                    accessibilityRole="button"
                    key={place.place_id}
                    onPress={() => void selectPlace(place)}
                    style={styles.resultItem}
                  >
                    <Ionicons name="location-outline" size={18} color={colors.primary} />
                    <View style={styles.resultTextBlock}>
                      <Text numberOfLines={1} style={styles.resultTitle}>{getPlaceTitle(place)}</Text>
                      {getPlaceSubtitle(place) ? (
                        <Text numberOfLines={1} style={styles.resultSubtitle}>{getPlaceSubtitle(place)}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : searchError ? (
              <Text style={styles.searchError}>{searchError}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.coords}>
            <Text style={styles.coordText}>{selected.latitude.toFixed(5)}</Text>
            <Text style={styles.coordText}>{selected.longitude.toFixed(5)}</Text>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formItem}>
              <TextField
                keyboardType="numeric"
                label="Radius meters"
                onChangeText={setRadiusMeters}
                placeholder="150"
                value={radiusMeters}
              />
            </View>
            <View style={styles.formItem}>
              <TextField
                label="Label"
                onChangeText={setLabel}
                placeholder="Office, home, store"
                value={label}
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <AppButton icon="checkmark" onPress={confirm} title="Use location" />
            <AppButton icon="arrow-back" onPress={() => navigation.goBack()} title="Cancel" variant="secondary" />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  headerText: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: 2
  },
  mapShell: {
    flex: 1,
    minHeight: 320,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.surface
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  mapKeyState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.surfaceSoft
  },
  mapKeyTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
    textAlign: "center"
  },
  mapKeyText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: 20,
    textAlign: "center"
  },
  searchPanel: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    overflow: "hidden"
  },
  searchInputRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
    paddingVertical: spacing.sm
  },
  results: {
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  resultItem: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  resultTextBlock: {
    flex: 1
  },
  resultTitle: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900"
  },
  resultSubtitle: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    marginTop: 2
  },
  searchError: {
    color: colors.danger,
    fontSize: typography.small,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm
  },
  panel: {
    gap: spacing.md,
    marginTop: spacing.md,
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
    fontSize: typography.small,
    fontWeight: "900",
    borderRadius: radius.md,
    backgroundColor: colors.input,
    padding: spacing.sm,
    overflow: "hidden"
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  formItem: {
    flex: 1
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  error: {
    color: colors.danger,
    lineHeight: 20
  }
});
