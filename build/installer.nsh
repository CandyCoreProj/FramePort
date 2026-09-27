; Safe uninstall: delete only the files FramePort installed, then remove the
; install folder only if it is empty. Replaces electron-builder's default,
; which runs RMDir /r on the whole install folder.
!macro customRemoveFiles
  SetOutPath $TEMP
  !include "${BUILD_RESOURCES_DIR}\uninstall-files.nsh"
  Delete "$INSTDIR\${UNINSTALL_FILENAME}"
  RMDir "$INSTDIR"
!macroend
