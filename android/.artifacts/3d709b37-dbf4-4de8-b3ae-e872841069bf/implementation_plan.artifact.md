# Implementation Plan - Fix Emulator Slowness and Optimize Build

The emulator is currently "offline," meaning it's struggling to boot. This is likely caused by the recent major upgrade to Gradle 9.5 and AGP 9.3, which are extremely resource-intensive. The current Gradle memory limit (1.5GB) is likely causing your computer to swap memory to the disk, which slows everything down to a crawl.

## User Review Required

> [!IMPORTANT]
> I recommend increasing the Gradle heap size to 4GB. This requires your machine to have at least 8GB or 16GB of total RAM. If you are on a very low-spec machine, we might need to reconsider the Gradle/AGP versions.

## Proposed Changes

### Build & System Performance

#### [MODIFY] [gradle.properties](file:///C:/Users/lynns/Documents/hiddenfeeai/android/gradle.properties)
- Increase `org.gradle.jvmargs` to `-Xmx4096m` to prevent excessive garbage collection and disk swapping.
- Enable `org.gradle.parallel=true` to allow Gradle to use multiple CPU cores.
- Enable `org.gradle.caching=true` to avoid re-doing work.
- (Optional) Remove `android.newDsl=false` and `android.builtInKotlin=false` as they might be forcing slower legacy paths in AGP 9.x.

## Verification Plan

### Automated Tests
- Run `adb devices` to see if the emulator eventually moves from `offline` to `device`.
- Run a Gradle build to verify improved performance.

### Manual Verification
- Check the "Build" output in Android Studio to ensure it's not still downloading heavy dependencies.
- Verify if the emulator becomes responsive.
