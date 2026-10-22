plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "com.juegos.tv"
    compileSdk = 34
    defaultConfig { applicationId = "com.juegos.tv"; minSdk = 24; targetSdk = 34; versionCode = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1; versionName = "1.0" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    signingConfigs { getByName("debug") { storeFile = file("debug.keystore"); storePassword = "android"; keyAlias = "androiddebugkey"; keyPassword = "android" } }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("org.nanohttpd:nanohttpd:2.3.1")
    implementation("androidx.core:core:1.12.0")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
}
