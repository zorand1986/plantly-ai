package com.thryveo.widget

object WidgetConstants {
    const val PREFS_NAME = "thryveo_widget_prefs"
    const val KEY_PLANTS = "plants_json"
    const val KEY_PENDING_WATERINGS = "pending_waterings"
    const val KEY_JUST_WATERED = "just_watered"   // boolean flag
    const val KEY_FORCE_UPDATE = "force_update_required"
    const val EXTRA_PLANT_ID = "plantId"
    const val EXTRA_ACTION = "action"
    const val ACTION_WATER = "water"
    const val ACTION_OPEN = "open"
    const val ACTION_CLEANUP = "cleanup"
    const val KEY_HEADER_LABEL = "header_label"  // written by loadData, read by updateAppWidget
    const val KEY_LOGGED_IN = "logged_in"        // false → show sign-in layout
}
