/**
 * Free HTTPS email relay for the Planer demo.
 * Configure EMAIL_API_SECRET in Apps Script > Project Settings > Script properties.
 * Deploy as a web app that executes as the owner and is available to anyone.
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const expectedSecret = PropertiesService.getScriptProperties().getProperty("EMAIL_API_SECRET");

    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: "UNAUTHORIZED" });
    }

    const to = String(payload.to || "").trim();
    const subject = String(payload.subject || "").trim();
    const html = String(payload.html || "");
    if (!to || !subject || !html || to.length > 254 || subject.length > 200 || html.length > 100000) {
      return jsonResponse({ ok: false, error: "INVALID_MESSAGE" });
    }
    if (MailApp.getRemainingDailyQuota() < 1) {
      return jsonResponse({ ok: false, error: "DAILY_QUOTA_REACHED" });
    }

    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: "Votre application mail ne prend pas en charge le format HTML.",
      htmlBody: html,
      name: "K-Planner"
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Mail relay failure: " + error);
    return jsonResponse({ ok: false, error: "MAIL_SEND_FAILED" });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
