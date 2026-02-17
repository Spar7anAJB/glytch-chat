!macro recoverFromBrokenUninstaller
  DetailPrint "Recovering from previous broken uninstall state."

  ${if} $INSTDIR != ""
    RMDir /r "$INSTDIR"
  ${endif}

  DeleteRegKey HKCU "${UNINSTALL_REGISTRY_KEY}"
  DeleteRegKey HKCU "${INSTALL_REGISTRY_KEY}"
  !ifdef UNINSTALL_REGISTRY_KEY_2
    DeleteRegKey HKCU "${UNINSTALL_REGISTRY_KEY_2}"
  !endif

  DeleteRegKey HKLM "${UNINSTALL_REGISTRY_KEY}"
  DeleteRegKey HKLM "${INSTALL_REGISTRY_KEY}"
  !ifdef UNINSTALL_REGISTRY_KEY_2
    DeleteRegKey HKLM "${UNINSTALL_REGISTRY_KEY_2}"
  !endif

  ClearErrors
  StrCpy $R0 0
!macroend

!macro customUnInstallCheck
  IfErrors 0 +2
    DetailPrint "Previous uninstaller could not be launched. Continuing with installer recovery."

  ${if} $R0 != 0
    DetailPrint "Previous uninstaller returned code $R0. Continuing with installer recovery."
  ${endif}

  !insertmacro recoverFromBrokenUninstaller
!macroend

!macro customUnInstallCheckCurrentUser
  IfErrors 0 +2
    DetailPrint "Previous per-user uninstaller could not be launched. Continuing with installer recovery."

  ${if} $R0 != 0
    DetailPrint "Previous per-user uninstaller returned code $R0. Continuing with installer recovery."
  ${endif}

  !insertmacro recoverFromBrokenUninstaller
!macroend
