package com.lechebaby.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class LecheBabyWidget extends AppWidgetProvider {

    private static final String ACTION_REGISTER = "com.lechebaby.app.ACTION_REGISTER";
    private static final String PREFS_NAME = "CapacitorStorage";
    private static final String FEEDINGS_KEY = "leche-baby-feedings";
    private static final String SETTINGS_KEY = "leche-baby-settings";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_REGISTER.equals(intent.getAction())) {
            registerFeeding(context);

            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(
                new android.content.ComponentName(context, LecheBabyWidget.class)
            );
            for (int id : ids) {
                updateWidget(context, manager, id);
            }
        }
    }

    private JSONObject readSettings(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String data = prefs.getString(SETTINGS_KEY, "{}");
        try {
            return new JSONObject(data);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private void registerFeeding(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String data = prefs.getString(FEEDINGS_KEY, "[]");
        JSONObject settings = readSettings(context);

        int defaultAmount = settings.optInt("defaultAmount", 120);
        String defaultType = settings.optString("defaultType", "Fórmula");

        try {
            JSONArray feedings = new JSONArray(data);
            long now = System.currentTimeMillis();

            JSONObject newFeeding = new JSONObject();
            newFeeding.put("id", now);
            newFeeding.put("timestamp", now);
            newFeeding.put("amount", defaultAmount);
            newFeeding.put("type", defaultType);

            JSONArray updated = new JSONArray();
            updated.put(newFeeding);
            for (int i = 0; i < feedings.length(); i++) {
                updated.put(feedings.get(i));
            }

            prefs.edit().putString(FEEDINGS_KEY, updated.toString()).apply();
        } catch (Exception e) {
            try {
                long now = System.currentTimeMillis();
                JSONArray fresh = new JSONArray();
                JSONObject newFeeding = new JSONObject();
                newFeeding.put("id", now);
                newFeeding.put("timestamp", now);
                newFeeding.put("amount", defaultAmount);
                newFeeding.put("type", defaultType);
                fresh.put(newFeeding);
                prefs.edit().putString(FEEDINGS_KEY, fresh.toString()).apply();
            } catch (Exception ignored) {}
        }
    }

    private void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_leche);

        // Set up the register button to send broadcast
        Intent registerIntent = new Intent(context, LecheBabyWidget.class);
        registerIntent.setAction(ACTION_REGISTER);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, 0, registerIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_button, pendingIntent);

        // Set up tap on widget body to open the app
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setAction(Intent.ACTION_MAIN);
        openAppIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        openAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent openAppPending = PendingIntent.getActivity(
            context, 1, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, openAppPending);

        // Apply widget transparency from settings
        JSONObject settings = readSettings(context);
        float widgetAlpha = (float) settings.optDouble("widgetAlpha", 0.7);
        views.setFloat(R.id.widget_root, "setAlpha", widgetAlpha);

        // Read interval from settings for overdue threshold
        double intervalHours = settings.optDouble("intervalHours", 4.0);
        long overdueMs = (long)(intervalHours * 60 * 60 * 1000);

        // Read last feeding from SharedPreferences
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String data = prefs.getString(FEEDINGS_KEY, "[]");

        try {
            JSONArray feedings = new JSONArray(data);
            if (feedings.length() > 0) {
                long latestTimestamp = 0;
                for (int i = 0; i < feedings.length(); i++) {
                    JSONObject f = feedings.getJSONObject(i);
                    long ts = f.getLong("timestamp");
                    if (ts > latestTimestamp) latestTimestamp = ts;
                }

                SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", Locale.getDefault());
                String timeStr = sdf.format(new Date(latestTimestamp));
                views.setTextViewText(R.id.widget_last_time, "Última: " + timeStr);

                long elapsed = System.currentTimeMillis() - latestTimestamp;
                long minutes = elapsed / 60000;
                long hours = minutes / 60;
                minutes = minutes % 60;

                String elapsedStr;
                if (hours > 0) {
                    elapsedStr = "Hace " + hours + "h " + minutes + "m";
                } else {
                    elapsedStr = "Hace " + minutes + "m";
                }
                views.setTextViewText(R.id.widget_elapsed, elapsedStr);

                if (elapsed > overdueMs) {
                    views.setTextColor(R.id.widget_elapsed, 0xFFFFD369);
                } else {
                    views.setTextColor(R.id.widget_elapsed, 0xFF4ECCA3);
                }
            } else {
                views.setTextViewText(R.id.widget_last_time, "Sin registros");
                views.setTextViewText(R.id.widget_elapsed, "");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.widget_last_time, "Sin registros");
            views.setTextViewText(R.id.widget_elapsed, "");
        }

        manager.updateAppWidget(widgetId, views);
    }
}
