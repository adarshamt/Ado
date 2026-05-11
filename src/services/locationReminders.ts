import { Platform } from "react-native";

import Constants from "expo-constants";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { getTodosForUser, saveTodosForUser } from "@/services/todoStorage";
import type { Todo } from "@/types/todo";

export const TODO_GEOFENCE_TASK = "ASH_TODO_GEOFENCE_TASK";
const LEGACY_TODO_NOTIFICATION_CHANNEL = "ash-todo-location-reminders";
export const TODO_NOTIFICATION_CHANNEL = "ash-todo-location-alerts-v2";

const isExpoGo = Constants.appOwnership === "expo";
const LOCATION_ALERT_THROTTLE_MS = 60 * 60 * 1000;

type Coordinate = {
  latitude: number;
  longitude: number;
};

type GeofenceTaskData = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
};

export type TodoArrival = {
  todo: Todo;
  distanceMeters: number;
};

type NotificationsModule = typeof import("expo-notifications");

async function getNotifications(): Promise<NotificationsModule | null> {
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

function distanceBetweenMeters(from: Coordinate, to: Coordinate) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function wasRecentlyNotified(todo: Todo) {
  if (!todo.lastNotifiedAt) {
    return false;
  }

  return Date.now() - new Date(todo.lastNotifiedAt).getTime() < LOCATION_ALERT_THROTTLE_MS;
}

void getNotifications().then((Notifications) => {
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });
});

if (!isExpoGo && !TaskManager.isTaskDefined(TODO_GEOFENCE_TASK)) {
  TaskManager.defineTask(TODO_GEOFENCE_TASK, async ({ data, error }) => {
    if (error || !data) {
      return;
    }

    const { eventType, region } = data as GeofenceTaskData;
    if (eventType !== Location.GeofencingEventType.Enter || !region.identifier) {
      return;
    }

    const [userId, todoId] = region.identifier.split(":");
    if (!userId || !todoId) {
      return;
    }

    const todos = await getTodosForUser(userId);
    const todo = todos.find((item) => item.id === todoId);

    if (!todo || todo.completed) {
      return;
    }

    const lastNotifiedAt = todo.lastNotifiedAt ? new Date(todo.lastNotifiedAt).getTime() : 0;
    const shouldThrottle = Date.now() - lastNotifiedAt < LOCATION_ALERT_THROTTLE_MS;
    if (shouldThrottle) {
      return;
    }

    const delivered = await scheduleTodoArrivalNotification(todo, userId);
    if (!delivered) {
      return;
    }

    const updated = todos.map((item) =>
      item.id === todo.id ? { ...item, lastNotifiedAt: new Date().toISOString() } : item
    );
    await saveTodosForUser(userId, updated);
  });
}

export async function configureNotifications() {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.deleteNotificationChannelAsync(LEGACY_TODO_NOTIFICATION_CHANNEL).catch(() => undefined);
    await Notifications.setNotificationChannelAsync(TODO_NOTIFICATION_CHANNEL, {
      name: "Location arrival alerts",
      description: "Sound alerts when you reach a todo reminder location.",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#326BFF",
      sound: "default",
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION_EVENT,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION
      },
      enableVibrate: true
    });
  }

  return true;
}

export async function scheduleTodoArrivalNotification(todo: Todo, userId: string) {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return false;
  }

  await configureNotifications();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Location reached",
      body: `You reached the selected location for "${todo.title}".`,
      data: { todoId: todo.id, userId },
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 250, 250, 250],
      interruptionLevel: "timeSensitive"
    },
    trigger: Platform.OS === "android" ? { channelId: TODO_NOTIFICATION_CHANNEL } : null
  });

  return true;
}

export async function requestNotificationPermission() {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return false;
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function requestLocationReminderPermissions() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  const notifications = await requestNotificationPermission();

  if (isExpoGo) {
    return {
      foreground: foreground.granted,
      background: false,
      notifications
    };
  }

  if (!foreground.granted) {
    return {
      foreground: false,
      background: false,
      notifications
    };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  return {
    foreground: foreground.granted,
    background: background.granted,
    notifications
  };
}

export async function getLocationPermissionSummary() {
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = isExpoGo
    ? { status: "expo-go-unavailable" }
    : await Location.getBackgroundPermissionsAsync();
  const Notifications = await getNotifications();
  const notifications = Notifications
    ? await Notifications.getPermissionsAsync()
    : { status: "expo-go-unavailable" };

  return {
    foreground: foreground.status,
    background: background.status,
    notifications: notifications.status
  };
}

export async function watchTodoArrivals(
  todos: Todo[],
  onArrival: (arrival: TodoArrival) => void
) {
  if (Platform.OS === "web") {
    return null;
  }

  const locationTodos = todos.filter((todo) => !todo.completed && todo.location && !wasRecentlyNotified(todo));
  if (locationTodos.length === 0) {
    return null;
  }

  const foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) {
    return null;
  }

  const notifiedThisSession = new Set<string>();

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 25,
      timeInterval: 10000
    },
    (position) => {
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      for (const todo of locationTodos) {
        if (!todo.location || notifiedThisSession.has(todo.id) || wasRecentlyNotified(todo)) {
          continue;
        }

        const distanceMeters = distanceBetweenMeters(current, todo.location);
        if (distanceMeters <= todo.location.radius) {
          notifiedThisSession.add(todo.id);
          onArrival({ todo, distanceMeters });
        }
      }
    }
  );
}

export async function registerTodoGeofences(userId: string, todos: Todo[]) {
  if (isExpoGo) {
    return 0;
  }

  const locationTodos = todos
    .filter((todo) => !todo.completed && todo.location)
    .slice(0, 20);

  const hasStarted = await Location.hasStartedGeofencingAsync(TODO_GEOFENCE_TASK);

  if (locationTodos.length === 0) {
    if (hasStarted) {
      await Location.stopGeofencingAsync(TODO_GEOFENCE_TASK);
    }
    return 0;
  }

  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();

  if (!foreground.granted || !background.granted) {
    return 0;
  }

  const regions: Location.LocationRegion[] = locationTodos.map((todo) => ({
    identifier: `${userId}:${todo.id}`,
    latitude: todo.location!.latitude,
    longitude: todo.location!.longitude,
    radius: todo.location!.radius,
    notifyOnEnter: true,
    notifyOnExit: false
  }));

  await Location.startGeofencingAsync(TODO_GEOFENCE_TASK, regions);
  return regions.length;
}
