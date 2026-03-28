/**
 * Form Submissions — make generated site forms actually work.
 *
 * Every generated site gets a form handler that:
 * 1. Intercepts form submit events
 * 2. Collects form data
 * 3. POSTs to our API endpoint
 * 4. Shows success/error to the visitor
 * 5. API forwards the data to the site owner via Telegram bot
 *
 * The form handler is injected alongside the analytics snippet.
 */

import { log } from "@wai/core";

/** A form submission received from a site. */
export interface FormSubmission {
  slug: string;
  formId: string;
  fields: Record<string, string>;
  submittedAt: Date;
  page: string;
  userAgent: string;
}

/** Per-slug submission store. Key = slug. */
const submissionStore = new Map<string, FormSubmission[]>();
const MAX_SUBMISSIONS_PER_SLUG = 500;

/** Mapping: slug → owner userId (for forwarding notifications). */
const ownerStore = new Map<string, string>();

/**
 * Register a site owner for form notifications.
 */
export function registerSiteOwner(slug: string, userId: string) {
  ownerStore.set(slug, userId);
  log.info({ service: "forms", action: "owner-registered", slug, userId });
}

/**
 * Get the owner userId for a slug.
 */
export function getSiteOwner(slug: string): string | undefined {
  return ownerStore.get(slug);
}

/**
 * Record a form submission.
 */
export function recordSubmission(submission: FormSubmission) {
  if (!submissionStore.has(submission.slug)) {
    submissionStore.set(submission.slug, []);
  }

  const subs = submissionStore.get(submission.slug)!;
  subs.push(submission);

  if (subs.length > MAX_SUBMISSIONS_PER_SLUG) {
    subs.splice(0, subs.length - MAX_SUBMISSIONS_PER_SLUG);
  }

  log.info({
    service: "forms", action: "submission-received",
    slug: submission.slug, formId: submission.formId,
    fieldCount: Object.keys(submission.fields).length,
  });
}

/**
 * Get all submissions for a slug.
 */
export function getSubmissions(slug: string): FormSubmission[] {
  return submissionStore.get(slug) ?? [];
}

/**
 * Get submission count for a slug.
 */
export function getSubmissionCount(slug: string): number {
  return (submissionStore.get(slug) ?? []).length;
}

/**
 * Clear submissions for a slug.
 */
export function clearSubmissions(slug: string) {
  submissionStore.delete(slug);
}

/**
 * Format a form submission for Telegram notification.
 */
export function formatSubmissionNotification(sub: FormSubmission): string {
  const lines: string[] = [
    `📬 *New form submission!*`,
    `🌐 Site: ${sub.slug}.wai.computer`,
    `📋 Form: ${sub.formId}`,
    `📅 ${sub.submittedAt.toISOString().slice(0, 16).replace("T", " ")}`,
    "",
  ];

  for (const [key, value] of Object.entries(sub.fields)) {
    const label = key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`*${label}:* ${value}`);
  }

  return lines.join("\n");
}

/**
 * Format submissions summary for /submissions command.
 */
export function formatSubmissionsSummary(slug: string): string {
  const subs = getSubmissions(slug);

  if (subs.length === 0) {
    return `📬 *${slug}*\n\nNo form submissions yet. Share your site to get leads!`;
  }

  const lines: string[] = [
    `📬 *Form Submissions: ${slug}* (${subs.length} total)\n`,
  ];

  // Show last 5 submissions
  const recent = subs.slice(-5).reverse();
  for (const sub of recent) {
    const time = sub.submittedAt.toISOString().slice(0, 16).replace("T", " ");
    const preview = Object.entries(sub.fields)
      .slice(0, 2)
      .map(([k, v]) => `${k}: ${v.slice(0, 30)}`)
      .join(", ");
    lines.push(`• ${time} — ${preview}`);
  }

  if (subs.length > 5) {
    lines.push(`\n_...and ${subs.length - 5} more_`);
  }

  return lines.join("\n");
}

/**
 * Generate the form handler JS snippet to inject into sites.
 * Intercepts all form submissions, collects data, POSTs to API.
 */
export function generateFormHandlerSnippet(slug: string, formEndpoint: string): string {
  return `<script>
(function(){
  var slug='${slug}',endpoint='${formEndpoint}';
  document.addEventListener('submit',function(e){
    var form=e.target;
    if(form.tagName!=='FORM')return;
    e.preventDefault();
    var data={},fd=new FormData(form);
    fd.forEach(function(v,k){data[k]=v;});
    var btn=form.querySelector('[type=submit]');
    if(btn){btn.disabled=true;btn.textContent='Sending...';}
    fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({slug:slug,formId:form.id||'form',fields:data,page:location.hash||'/',ua:navigator.userAgent})
    }).then(function(r){return r.json()}).then(function(r){
      if(btn){btn.textContent='✓ Sent!';btn.style.background='#22c55e';btn.style.color='#fff';}
      var msg=document.createElement('div');
      msg.style.cssText='position:fixed;top:20px;right:20px;background:#22c55e;color:#fff;padding:16px 24px;border-radius:12px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
      msg.textContent='✓ Message sent successfully!';
      document.body.appendChild(msg);
      setTimeout(function(){msg.remove()},4000);
      form.reset();
      setTimeout(function(){if(btn){btn.disabled=false;btn.textContent='Send';}},3000);
    }).catch(function(){
      if(btn){btn.disabled=false;btn.textContent='Send';}
      alert('Failed to send. Please try again.');
    });
  },true);
})();
</script>`;
}
