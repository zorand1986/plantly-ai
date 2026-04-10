package com.thryveo.widget

import android.content.Intent
import android.widget.RemoteViewsService

class PlantWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        PlantWidgetFactory(applicationContext, intent)
}
