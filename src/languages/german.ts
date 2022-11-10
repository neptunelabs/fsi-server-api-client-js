export const german: { [key: string]: any; } = {
  commands: {
    cancel: "abbrechen",
    overwrite: "überschreiben",
    overwriteAll: "alle überschreiben",
    skip: "übergehen",
    skipAll: "alle übergehen"
  },
  errors: {
    addEntry: "Der Eintrag \"%s\" konnte nicht hinzugefügt werden",
    anyError: "\"%s\"",
    batchLocalFiles: "Der Befehl \"%s\" kann nicht ausgeführt werden, weil der Queue lokale Dateien enthält.",
    batchNonLocalFiles: "Der Befehl \"%s\" kann nicht ausgeführt werden, weil der Queue nicht-lokale Dateien enthält.",
    changeMetaData: "Die Metadaten von \"%s\" konnten nicht geändert werden.",
    changePassWord: "Ändern des Passwortes ist fehlgeschlagen",
    changeUser: "Wechsel zu Benutzer \"%s\" ist fehlgeschlagen.",
    copyDir: "Der Ordner \"%s\" konnte nicht nach \"%s\" kopiert werden.",
    copyFile: "Die Datei \"%s\" konnte nicht nach \"%s\" kopiert werden.",
    createDir: "Das Verzeichnis \"%s\" konnte nicht erstellt werden.",
    deleteDir: "Der Ordner \"%s\" konnte nicht gelöscht werden.",
    deleteFile: "Die Datei \"%s\" konnte nicht gelöscht werden.",
    downloadFile: "Download von \"%s\" ist fehlgeschlagen.",
    getMetaData: "Metadaten für Datei \"%s\" konnten nicht geladen werden.",
    getUserList: "Die Liste der Benutzer konnte nicht geladen werden.",
    httpError: "Der Server hat mit %s auf die Anfrage %s geantwortet.",
    httpErrorShort: "Der Server hat mit %s geantwortet.",
    invalidDirName: "Der Verzeichnisname enthält folgende ungültige Zeichen: \"%s\"",
    invalidNewName: "Der neue Name enthält die folgenden ungültigen Zeichen: \"%s\".",
    invalidPath: "Der Pfad \"%s\" ist ungültig.",
    invalidServerReply: "Der Server hat eine ungültige Antwort geliefert.",
    invalidServiceName: "\"%s\" ist kein gültiger service.",
    invalidTargetPath: "Der Zielpfad ist ungültig.",
    isDirectory: "\"%s\" ist ein Verzeichnis.",
    list: "Die Liste \"%s\" konnte nicht geladen werden.",
    login: "Konnte den Benutzer \"%s\" nicht einloggen.",
    logout: "Konnte den Benutzer nicht ausloggen.",
    logoutNotLoggedIn: "Ausloggen fehlgeschlagen. Es gibt keine aktive Session.",
    noValidFile: "Der Pfad \"%s\" enthält kleinen gültigen Dateinamen.",
    queueRunning: "Die Stapelverarbeitung kann nicht gestartet werden, weil sie bereits läuft.",
    queueStoppedWithErrors: "Die Stapelverarbeitung wurde aufgrund von Fehlern angehalten.",
    reImportDir: "Der Ordner \"%s\" konnte nicht für den Re-Import hinzugefügt werden.",
    reImportFile: "Die Datei \"%s\" konnte nicht für den Re-Import hinzugefügt werden.",
    reImportNothing: "Mindestens eine der Optionen \"Image\" oder \"iMetaData\" muss gesetzt sein.",
    rename: "Konnte \"%s\" nicht in \"%s\" umbenennen.",
    serverError: "Der Server antwortet: %s",
    serverRefusedPlainPassword: "Ein unverschlüsseltes Passwort wird nicht über eine unsichere Verbindung gesendet.",
    templateContent: {
      "Unknown User or password wrong": "Unbekannter Benutzer oder falsches Passwort"
    },
    upload: "Upload von \"%s\" ist fehlgeschlagen.",
    userAborted: "Abbruch durch den Benutzer"

  },
  locale: {
    "decimalSeparator": ",",
    "language": "Deutsch",
    "thousandSeparator": ".",
  },
  tasks: {
    addEntries: "Füge %s Einträge zur Stapelverarbeitung hinzu",
    addingEntry: "Füge Eintrag %s/%s: \"%s\" hinzu",
    addingEntryList: "Lese Liste %s/%s für \"%s\"",
    any: "%s",
    batchCopy: "Kopiere %s Elemente",
    batchDelete: "Lösche %s Elemente",
    batchDownload: "Lade %s Dateien nach \"%s\" herunter",
    batchDownloadBrowser: "Bereite Download von  %s Dateien vor",
    batchGetMateData: "Lese Metadaten von %s Elementen",
    batchMove: "Verschiebe %s Elemente",
    batchReImport: "Reimportiere %s Dateien",
    batchRename: "Benenne %s Elemente um",
    batchSendServiceCommands: "Sende den Service Befehl \"%s\" an %s %s Elemente",
    batchSetMetaData: "Speichere Metadaten von %s Elementen",
    batchUpload: "Lade %s Dateien nach \"%s\" hoch",
    changePassWord: "Ändere das Passwort für den Benutzer \"%s\"",
    changeUser: "Ändere den aktuellen Benutzer zu \"%s\"",
    continueAfterError: "%s Wollen Sie die Ausführung fortsetzen ?",
    copyDir: "Kopiere Ordner \"%s\" nach \"%s\"",
    copyFile: "Kopiere Datei \"%s\" nach \"%s\"",
    createDir: "Erstelle Verzeichnis \"%s\"",
    deleteDir: "Lösche Ordner \"%s\"",
    deleteFile: "Lösche Datei \"%s\"",
    downloadFile: "Lade \"%s\" herunter",
    getMetaData: "Lade Metadaten für \"%s\"",
    getUserList: "Lade List der Benutzer",
    idle: "warte",
    logBatchContent: "Gebe aktuelle Elemente der Stapelverarbeitung aus",
    logBatchContentSummary: "Gebe die Zusammenfassung der aktuellen Elemente der Stapelverarbeitung aus",
    login: "Anmeldung auf Server \"%s\" als Benutzer \"%s\"",
    logout: "Abmelden von Server \"%s\"",
    moveDir: "Verschiebe Ordner \"%s\" nach \"%s\"",
    moveFile: "Verschiebe Datei \"%s\" nach \"%s\"",
    overwriteTargetDirectory: "Der Ordner \"%s\" existiert bereits. Überschreiben?",
    overwriteTargetFile: "Die Datei \"%s\" existiert bereits. Überschreiben?",
    preparingFile: "Bereite Download von \"%s\" vor",
    processFile: "Verarbeite Datei \"%s\"",
    queueContentSummary: "Zusammenfassung der aktuellen Elemente der Stapelverarbeitung:",
    queueEmpty: "Es gibt derzeit keine Elemente für die Stapelverarbeitung.",
    queueFinished: "Die Stapelverarbeitung wurde mit %s Fehlern nach %s beendet",
    queueStart: "Starte Stapelverabreitung mit %s Befehlen",
    reImportDir: "Ordner \"%s\" wird für den Re-Import markiert",
    reImportFile: "Datei \"%s\" wird für den Re-Import markiert",
    readDataTransfer: "Erstelle Liste lokaler Dateien",
    readListConnectors: "Lade Liste der Connectors",
    readListLocal: "Lese lokales Verzeichnis \"%s\"",
    readListServer: "Lade Ordnerinhalt von \"%s\"",
    readSubDir: "Lese Inhalt von Unterordner \"%s\"",
    renameDir: "Benenne Ordner \"%s\" in \"%s\" um",
    renameFile: "Benenne Datei \"%s\" in \"%s\" um",
    sendServiceCommand: "Sende Service Befehl \"%s\" an %s \"%s\"",
    sendPlainPassword: "Der Server erwartet ein unverschlüsseltes Passwort.<br/>Sie nutzen derzeit <b>keine sichere HTTPS Verbindung</b>.<br/><br/>Wollen Sie trotzdem fortsetzen und das <b>unverschlüsselte Passwort</b> senden?",
    setMetaData: "Speichere Metadaten für %s \"%s\", Daten: \"%s\"",
    skipConnectorType: "Übergehe Inhalt von \"%s\", weil der Connectortyp \"%s\" nicht durch die list Option \"validConnectorTypes\" erlaubt wurde",
    skipDir: "Übergehe Unterordner von \"%s\" mit einer Verzeichnistiefe > %s",
    skipDirBlackList: "Übergehe Unterordner \"%s\" (blacklist)",
    skipDirNote: "Übergehe Unterordner mit einer Verzeichnistiefe > %s",
    skipDownload: "Übergehe Download, weil die Datei \"%s\" bereits existiert. (benutzen Sie options.overwriteExisting:true um vorhandene Dateien zu überschreiben)",
    skipInternalConnector: "Übergehe internen Connector \"%s\", weil die list Option \"readInternalConnectors\" nicht \"true\" ist",
    skipUpload: "Übergehe Upload, weil die Datei \"%s\" bereits existiert. (benutzen Sie options.overwriteExisting:true um vorhandene Dateien zu überschreiben)",
    skipUploadDir: "Überspringe Verzeichnis \"%s\" (existiert bereits)",
    skipUploadDirFlatten: "Überspringe Verzeichnis \"%s\" (options.flattenTargetPath ist aktiviert)",
    skipping: "Überspringe \"%s\"",
    startQueueCommand: "Starte Befehl %s/%s: \"%s\"",
    uploadFile: "Lade \"%s\" hoch",
    waitDownload: "Warte bis der Server das Downloadarchiv \"%s\" fertiggestellt hat",

    templateContent: {}
  },
  timePeriods: {
    day: "Tag",
    days: "Tage",
    hour: "Stunde",
    hours: "Stunden",
    minute: "Minute",
    minutes: "Minuten",
    second: "Sekunde",
    seconds: "Sekunden",
    millisecond: "Millisekunde",
    milliseconds: "Millisekunden"
  }

};
