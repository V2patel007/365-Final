
/**
 * DEV365 DATABASE BACKEND - v6 (Enhanced Robustness)
 */

const HEADERS = [
  "ID (Date)",           // A
  "Day #",               // B
  "App Title",           // C (1)
  "Project Phase",       // D (2)
  "Last Updated",        // E (3)
  "Project Description", // F (4)
  "App Use Case",        // G (5)
  "Targeted Audience",   // H (6)
  "Demo URL",            // I (7)
  "Git Repo",            // J (8)
  "PRD",                 // K (9)
  "Studio Prompt",       // L (10)
  "Dev Hrs",             // M (11)
  "Revenue",             // N (12)
  "Signups",             // O (13)
  "Build Milestones",    // P (14)
  "Social Launch Center",// Q (15)
  "Full Payload (JSON)"  // R (Robust Backup)
];

function manualSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("RoadmapData") || ss.insertSheet("RoadmapData");
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange("1:1").setFontWeight("bold").setBackground("#f1f5f9").setFontColor("#1e293b");
  sheet.getRange("A:A").setNumberFormat("@");
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({error: "No data received"});
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("RoadmapData") || ss.insertSheet("RoadmapData");
    
    // Parse the raw string sent from the frontend
    var content = JSON.parse(e.postData.contents);
    var action = content.action;
    var payload = content.payload;

    if (action === 'UPDATE') {
      upsertProject(sheet, payload);
    } else if (action === 'SYNC_ALL') {
      syncAllProjects(sheet, payload);
    } else if (action === 'DELETE') {
      deleteProject(sheet, payload.id);
    }

    return createJsonResponse({status: "success", action: action});
  } catch (err) {
    return createJsonResponse({status: "error", message: err.toString()});
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'PING') return createJsonResponse({status: "online"});

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("RoadmapData");

  if (action === 'READ' && sheet) {
    var data = {};
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var id = String(rows[i][0]).trim();
      try {
        var project = JSON.parse(rows[i][HEADERS.length - 1]); 
        data[id] = project;
      } catch(err) {}
    }
    return createJsonResponse(data);
  }
  return ContentService.createTextOutput("Service Active").setMimeType(ContentService.MimeType.TEXT);
}

function upsertProject(sheet, project) {
  // Ensure Column A is always Plain Text to prevent ID conversion bugs
  sheet.getRange("A:A").setNumberFormat("@");
  
  var id = String(project.id).trim();
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      rowIndex = i + 1;
      break;
    }
  }

  var rowData = mapProjectToRow(project);
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function syncAllProjects(sheet, projects) {
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange("A:A").setNumberFormat("@");
  
  var rows = [];
  var sortedIds = Object.keys(projects).sort();
  for (var i = 0; i < sortedIds.length; i++) {
    rows.push(mapProjectToRow(projects[sortedIds[i]]));
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  }
}

function deleteProject(sheet, id) {
  var idToMatch = String(id).trim();
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === idToMatch) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function mapProjectToRow(p) {
  var milestones = [];
  if (p.ideaFinalized) milestones.push("Idea Finalized");
  if (p.promptDesigned) milestones.push("Prompt Designed");
  if (p.coreLogicBuilt) milestones.push("Core Logic Built");
  if (p.uiReady) milestones.push("UI/UX Ready");
  if (p.mvpCompleted) milestones.push("MVP Completed");
  if (p.ctaAdded) milestones.push("CTA Added");

  var socialSummary = "";
  if (p.platformPosts) {
    socialSummary = Object.keys(p.platformPosts)
      .filter(k => p.platformPosts[k])
      .map(k => k.toUpperCase() + ": Generated")
      .join(", ");
  }

  return [
    p.id,                  // A: ID
    p.dayNumber || "",      // B: Day #
    p.title || "",          // C
    p.status || "",         // D
    new Date(),             // E
    p.description || "",    // F
    p.useCase || "",        // G
    p.targetAudience || "", // H
    p.demoUrl || "",        // I
    p.githubUrl || "",      // J
    p.prd || "",            // K
    p.studioPrompt || "",   // L
    p.buildTime || 0,       // M
    p.revenueGenerated || 0,// N
    p.usersSignups || 0,    // O
    milestones.join(", "),  // P
    socialSummary,          // Q
    JSON.stringify(p)       // R
  ];
}
