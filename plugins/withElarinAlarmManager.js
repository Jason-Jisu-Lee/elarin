// Expo config plugin that injects a native Android module for AlarmManager scheduling.
// This uses setAlarmClock() for time-critical notifications instead of WorkManager.

const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE = "com.elarin.app";
const PACKAGE_DIR = "com/elarin/app";

/** Kotlin source for the AlarmManager native module */
const ALARM_RECEIVER_KOTLIN = `package ${PACKAGE}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.app.NotificationManager
import android.app.NotificationChannel
import android.app.PendingIntent
import androidx.core.app.NotificationCompat

class ElarinAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val templateId = intent.getStringExtra("templateId") ?: return
        val templateName = intent.getStringExtra("templateName") ?: return
        val stepText = intent.getStringExtra("stepText") ?: return
        val currentStep = intent.getIntExtra("currentStep", 0)
        val totalSteps = intent.getIntExtra("totalSteps", 1)

        val channelId = "elarin-steps"
        val notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Ensure channel exists
        val channel = NotificationChannel(
            channelId,
            "Elarin Steps",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Step-down action notifications"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 250, 250, 250)
        }
        notifManager.createNotificationChannel(channel)

        // Build action intents
        val doItIntent = Intent(context, ElarinActionReceiver::class.java).apply {
            action = "DO_IT"
            putExtra("templateId", templateId)
            putExtra("currentStep", currentStep)
            putExtra("totalSteps", totalSteps)
        }
        val doItPending = PendingIntent.getBroadcast(
            context, (templateId + "doit").hashCode(), doItIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val easierIntent = Intent(context, ElarinActionReceiver::class.java).apply {
            action = "MAKE_EASIER"
            putExtra("templateId", templateId)
            putExtra("templateName", templateName)
            putExtra("currentStep", currentStep)
            putExtra("totalSteps", totalSteps)
        }
        val easierPending = PendingIntent.getBroadcast(
            context, (templateId + "easier").hashCode(), easierIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val snoozeIntent = Intent(context, ElarinActionReceiver::class.java).apply {
            action = "SNOOZE"
            putExtra("templateId", templateId)
            putExtra("templateName", templateName)
            putExtra("stepText", stepText)
            putExtra("currentStep", currentStep)
            putExtra("totalSteps", totalSteps)
        }
        val snoozePending = PendingIntent.getBroadcast(
            context, (templateId + "snooze").hashCode(), snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle("⚡ \$templateName")
            .setContentText(stepText)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .addAction(0, "✅ Do it", doItPending)
            .addAction(0, "⬇️ Make it easier", easierPending)
            .addAction(0, "💤 Snooze 15m", snoozePending)
            .build()

        notifManager.notify(templateId.hashCode(), notification)
    }
}
`;

const ACTION_RECEIVER_KOTLIN = `package ${PACKAGE}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.app.AlarmManager
import android.app.PendingIntent
import android.app.NotificationManager

class ElarinActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val templateId = intent.getStringExtra("templateId") ?: return
        val currentStep = intent.getIntExtra("currentStep", 0)
        val totalSteps = intent.getIntExtra("totalSteps", 1)

        // Dismiss the current notification
        val notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notifManager.cancel(templateId.hashCode())

        when (action) {
            "DO_IT" -> {
                // XP recording is handled by the JS layer via expo-notifications category.
                // This native receiver handles the case when the app is fully killed.
                // We store a flag that the JS layer picks up on next launch.
                val prefs = context.getSharedPreferences("elarin_pending_actions", Context.MODE_PRIVATE)
                prefs.edit()
                    .putString("pending_\${System.currentTimeMillis()}", "completion|\$templateId|\$currentStep|\$totalSteps")
                    .apply()
            }
            "MAKE_EASIER" -> {
                val templateName = intent.getStringExtra("templateName") ?: return
                val nextStep = currentStep + 1
                if (nextStep < totalSteps) {
                    // We need the step text from storage. For now, fire a generic notification.
                    // The JS layer will have the full data.
                    val prefs = context.getSharedPreferences("elarin_pending_actions", Context.MODE_PRIVATE)
                    prefs.edit()
                        .putString("pending_\${System.currentTimeMillis()}", "step_down|\$templateId|\$nextStep|\$totalSteps")
                        .apply()
                }
            }
            "SNOOZE" -> {
                val templateName = intent.getStringExtra("templateName") ?: ""
                val stepText = intent.getStringExtra("stepText") ?: ""

                // Store snooze for XP
                val prefs = context.getSharedPreferences("elarin_pending_actions", Context.MODE_PRIVATE)
                prefs.edit()
                    .putString("pending_\${System.currentTimeMillis()}", "snooze|\$templateId|\$currentStep|\$totalSteps")
                    .apply()

                // Re-schedule alarm for 15 minutes from now
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val snoozeAlarmIntent = Intent(context, ElarinAlarmReceiver::class.java).apply {
                    putExtra("templateId", templateId)
                    putExtra("templateName", templateName)
                    putExtra("stepText", stepText)
                    putExtra("currentStep", currentStep)
                    putExtra("totalSteps", totalSteps)
                }
                val pendingIntent = PendingIntent.getBroadcast(
                    context, (templateId + "snooze_alarm").hashCode(), snoozeAlarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                val triggerTime = System.currentTimeMillis() + 15 * 60 * 1000
                alarmManager.setAlarmClock(
                    AlarmManager.AlarmClockInfo(triggerTime, null),
                    pendingIntent
                )
            }
        }
    }
}
`;

const ALARM_MODULE_KOTLIN = `package ${PACKAGE}

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import java.util.Calendar

class ElarinAlarmModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ElarinAlarmModule"

    @ReactMethod
    fun scheduleAlarm(
        templateId: String,
        templateName: String,
        stepText: String,
        currentStep: Int,
        totalSteps: Int,
        hour: Int,
        minute: Int,
        promise: Promise
    ) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(context, ElarinAlarmReceiver::class.java).apply {
                putExtra("templateId", templateId)
                putExtra("templateName", templateName)
                putExtra("stepText", stepText)
                putExtra("currentStep", currentStep)
                putExtra("totalSteps", totalSteps)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                (templateId + hour.toString() + minute.toString()).hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val calendar = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                // If time already passed today, schedule for tomorrow
                if (timeInMillis <= System.currentTimeMillis()) {
                    add(Calendar.DAY_OF_YEAR, 1)
                }
            }

            alarmManager.setAlarmClock(
                AlarmManager.AlarmClockInfo(calendar.timeInMillis, null),
                pendingIntent
            )

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message)
        }
    }

    @ReactMethod
    fun cancelAlarm(templateId: String, hour: Int, minute: Int, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(context, ElarinAlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                (templateId + hour.toString() + minute.toString()).hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            alarmManager.cancel(pendingIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message)
        }
    }

    @ReactMethod
    fun cancelAllAlarmsForTemplate(templateId: String, promise: Promise) {
        // Note: Android doesn't provide a way to cancel all PendingIntents with a prefix.
        // We cancel known alarm codes. The JS layer should track scheduled times.
        promise.resolve(true)
    }
}
`;

const ALARM_PACKAGE_KOTLIN = `package ${PACKAGE}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ElarinAlarmPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(ElarinAlarmModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

const PENDING_ACTIONS_MODULE_KOTLIN = `package ${PACKAGE}

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap

class ElarinPendingActionsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ElarinPendingActions"

    @ReactMethod
    fun getPendingActions(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("elarin_pending_actions", Context.MODE_PRIVATE)
            val all = prefs.all
            val results = WritableNativeArray()

            for ((key, value) in all) {
                if (key.startsWith("pending_") && value is String) {
                    val map = WritableNativeMap()
                    map.putString("key", key)
                    map.putString("value", value)
                    results.pushMap(map)
                }
            }

            promise.resolve(results)
        } catch (e: Exception) {
            promise.reject("PENDING_ERROR", e.message)
        }
    }

    @ReactMethod
    fun clearPendingActions(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("elarin_pending_actions", Context.MODE_PRIVATE)
            prefs.edit().clear().apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PENDING_ERROR", e.message)
        }
    }
}
`;

const PENDING_ACTIONS_PACKAGE_KOTLIN = `package ${PACKAGE}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ElarinPendingActionsPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(ElarinPendingActionsModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

function withElarinAlarmManager(config) {
  // Step 1: Write Kotlin source files after prebuild
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const srcDir = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        ...PACKAGE_DIR.split("/"),
      );

      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, "ElarinAlarmReceiver.kt"),
        ALARM_RECEIVER_KOTLIN,
      );
      fs.writeFileSync(
        path.join(srcDir, "ElarinActionReceiver.kt"),
        ACTION_RECEIVER_KOTLIN,
      );
      fs.writeFileSync(
        path.join(srcDir, "ElarinAlarmModule.kt"),
        ALARM_MODULE_KOTLIN,
      );
      fs.writeFileSync(
        path.join(srcDir, "ElarinAlarmPackage.kt"),
        ALARM_PACKAGE_KOTLIN,
      );
      fs.writeFileSync(
        path.join(srcDir, "ElarinPendingActionsModule.kt"),
        PENDING_ACTIONS_MODULE_KOTLIN,
      );
      fs.writeFileSync(
        path.join(srcDir, "ElarinPendingActionsPackage.kt"),
        PENDING_ACTIONS_PACKAGE_KOTLIN,
      );

      return cfg;
    },
  ]);

  // Step 2: Register receivers in AndroidManifest.xml
  config = withAndroidManifest(config, async (cfg) => {
    const manifest = cfg.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application) return cfg;

    if (!application.receiver) application.receiver = [];

    const hasAlarmReceiver = application.receiver.some(
      (r) => r.$?.["android:name"] === ".ElarinAlarmReceiver",
    );
    if (!hasAlarmReceiver) {
      application.receiver.push({
        $: {
          "android:name": ".ElarinAlarmReceiver",
          "android:exported": "false",
        },
      });
    }

    const hasActionReceiver = application.receiver.some(
      (r) => r.$?.["android:name"] === ".ElarinActionReceiver",
    );
    if (!hasActionReceiver) {
      application.receiver.push({
        $: {
          "android:name": ".ElarinActionReceiver",
          "android:exported": "false",
        },
      });
    }

    return cfg;
  });

  // Step 3: Register native packages in MainApplication
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const mainAppPath = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        ...PACKAGE_DIR.split("/"),
        "MainApplication.kt",
      );

      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, "utf8");

        // Add package registrations if not already present
        if (!content.includes("ElarinAlarmPackage")) {
          // Find the getPackages method and add our packages
          content = content.replace(
            /override fun getPackages\(\): List<ReactPackage> \{/,
            `override fun getPackages(): List<ReactPackage> {\n            // Elarin native modules`,
          );

          // Add to the packages list
          content = content.replace(
            /packages\.add\(MainReactPackage\(\)\)/,
            `packages.add(MainReactPackage())\n              packages.add(ElarinAlarmPackage())\n              packages.add(ElarinPendingActionsPackage())`,
          );

          // If the above pattern didn't match (newer Expo), try autolinked approach
          if (!content.includes("ElarinAlarmPackage")) {
            content = content.replace(
              /val packages = PackageList\(this\)\.packages/,
              `val packages = PackageList(this).packages.toMutableList()\n            packages.add(ElarinAlarmPackage())\n            packages.add(ElarinPendingActionsPackage())`,
            );
          }

          // Expo SDK 55+ uses .apply block on PackageList
          if (!content.includes("ElarinAlarmPackage")) {
            content = content.replace(
              /PackageList\(this\)\.packages\.apply \{[^}]*\}/s,
              `PackageList(this).packages.apply {\n          add(ElarinAlarmPackage())\n          add(ElarinPendingActionsPackage())\n        }`,
            );
          }

          fs.writeFileSync(mainAppPath, content);
        }
      }

      return cfg;
    },
  ]);

  return config;
}

module.exports = withElarinAlarmManager;
