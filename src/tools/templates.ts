import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  actions: number;
  yaml: string;
}

// Templates from official Tracecat documentation and community sources.
// To add a template: push a new Template object to this array.
const TEMPLATES: Template[] = [
  {
    id: "crowdsec_false_positive",
    title: "CrowdSec False Positive Manager",
    description: "Check IP reputation via CrowdSec CTI API and conditionally unblock benign IPs. Source: aukfood.fr community blog.",
    category: "threat_response",
    actions: 3,
    yaml: `# CrowdSec False Positive Manager
# Source: https://www.aukfood.fr/faux-positifs-sous-controle-grace-a-tracecat-et-crowdsec/
# Trigger: webhook with { "ip_address": "x.x.x.x" }
# Secrets required: crowdsec (keys: API_TOKEN)

definition:
  title: CrowdSec False Positive Manager
  description: Check IP reputation via CrowdSec CTI and conditionally unblock benign IPs

  triggers:
    - type: webhook
      ref: incoming_ip

  actions:
    - ref: lookup_ip_reputation
      action: core.http_request
      args:
        url: "https://cti.api.crowdsec.net/v2/smoke/\${{ TRIGGER.data.ip_address }}"
        method: GET
        headers:
          x-api-key: \${{ SECRETS.crowdsec.API_TOKEN }}
          Accept: application/json

    - ref: evaluate_reputation
      action: core.transform.reshape
      args:
        value:
          ip: \${{ TRIGGER.data.ip_address }}
          is_benign: \${{ ACTIONS.lookup_ip_reputation.result.reputation == "benign" }}
          reputation: \${{ ACTIONS.lookup_ip_reputation.result.reputation }}
          total_reports: \${{ ACTIONS.lookup_ip_reputation.result.ip_range_score }}
          background_noise_score: \${{ ACTIONS.lookup_ip_reputation.result.background_noise_score }}
      depends_on: [lookup_ip_reputation]

    - ref: unblock_benign_ip
      action: core.http_request
      args:
        url: "https://admin.api.crowdsec.net/v1/decisions"
        method: DELETE
        headers:
          x-api-key: \${{ SECRETS.crowdsec.API_TOKEN }}
          Content-Type: application/json
        params:
          ip: \${{ TRIGGER.data.ip_address }}
      run_if: \${{ ACTIONS.evaluate_reputation.result.is_benign }}
      depends_on: [evaluate_reputation]`,
  },
  {
    id: "wazuh_alert_to_case",
    title: "Wazuh Alert-to-Case Pipeline",
    description: "Receive Wazuh alerts via webhook, enrich with agent info, evaluate severity, and create a Tracecat case. Source: aukfood.fr community blog.",
    category: "alert_management",
    actions: 5,
    yaml: `# Wazuh Alert-to-Case Pipeline
# Source: https://www.aukfood.fr/tracecat-le-soar-open-source-qui-change-la-donne/
# Trigger: webhook from Wazuh (alert JSON)
# Secrets required: wazuh (keys: API_KEY, SERVER_URL)

definition:
  title: Wazuh Alert-to-Case Pipeline
  description: Ingest Wazuh alerts, enrich with agent info, and create investigation cases

  triggers:
    - type: webhook
      ref: wazuh_alert

  actions:
    - ref: parse_alert
      action: core.transform.reshape
      args:
        value:
          alert_id: \${{ TRIGGER.data.id }}
          rule_id: \${{ TRIGGER.data.rule.id }}
          rule_level: \${{ TRIGGER.data.rule.level }}
          rule_description: \${{ TRIGGER.data.rule.description }}
          agent_id: \${{ TRIGGER.data.agent.id }}
          agent_name: \${{ TRIGGER.data.agent.name }}
          timestamp: \${{ TRIGGER.data.timestamp }}
          src_ip: \${{ TRIGGER.data.data.srcip }}

    - ref: get_agent_info
      action: core.http_request
      args:
        url: "\${{ SECRETS.wazuh.SERVER_URL }}/agents/\${{ ACTIONS.parse_alert.result.agent_id }}"
        method: GET
        headers:
          Authorization: "Bearer \${{ SECRETS.wazuh.API_KEY }}"
        verify_ssl: false
      depends_on: [parse_alert]

    - ref: evaluate_severity
      action: core.transform.reshape
      args:
        value:
          priority: \${{ FN.conditional(ACTIONS.parse_alert.result.rule_level > 12, "critical", FN.conditional(ACTIONS.parse_alert.result.rule_level > 8, "high", FN.conditional(ACTIONS.parse_alert.result.rule_level > 4, "medium", "low"))) }}
          malice: \${{ FN.conditional(ACTIONS.parse_alert.result.rule_level > 10, "malicious", "unknown") }}
      depends_on: [parse_alert]

    - ref: create_investigation_case
      action: core.cases.create_case
      args:
        case_title: "[Wazuh] \${{ ACTIONS.parse_alert.result.rule_description }}"
        priority: \${{ ACTIONS.evaluate_severity.result.priority }}
        malice: \${{ ACTIONS.evaluate_severity.result.malice }}
        status: new
        payload:
          alert_id: \${{ ACTIONS.parse_alert.result.alert_id }}
          rule_id: \${{ ACTIONS.parse_alert.result.rule_id }}
          agent: \${{ ACTIONS.get_agent_info.result.data.name }}
          src_ip: \${{ ACTIONS.parse_alert.result.src_ip }}
      depends_on: [evaluate_severity, get_agent_info]

    - ref: add_context_comment
      action: core.cases.create_comment
      args:
        case_id: \${{ ACTIONS.create_investigation_case.result.id }}
        content: "Auto-created from Wazuh alert. Agent: \${{ ACTIONS.get_agent_info.result.data.name }} (OS: \${{ ACTIONS.get_agent_info.result.data.os.platform }}). Rule level: \${{ ACTIONS.parse_alert.result.rule_level }}"
      depends_on: [create_investigation_case]`,
  },
  {
    id: "crowdstrike_forensics",
    title: "CrowdStrike Evidence Collection",
    description: "Collect forensic evidence from CrowdStrike Falcon: detections, device info, IOCs, and network connections. Source: stickyricebytes.com community blog.",
    category: "forensics",
    actions: 6,
    yaml: `# CrowdStrike Evidence Collection
# Source: https://stickyricebytes.com/2025/02/11/crowdstrike-falcon-forensics-with-tracecat/
# Trigger: webhook with { "host_id": "device-id", "detection_id": "ldt:xxx" }
# Secrets required: crowdstrike (keys: CLIENT_ID, CLIENT_SECRET, BASE_URL)

definition:
  title: CrowdStrike Evidence Collection
  description: Gather forensic evidence from CrowdStrike Falcon for incident investigation

  triggers:
    - type: webhook
      ref: forensic_request

  actions:
    - ref: authenticate
      action: core.http_request
      args:
        url: \${{ SECRETS.crowdstrike.BASE_URL }}/oauth2/token
        method: POST
        headers:
          Content-Type: application/x-www-form-urlencoded
        payload:
          client_id: \${{ SECRETS.crowdstrike.CLIENT_ID }}
          client_secret: \${{ SECRETS.crowdstrike.CLIENT_SECRET }}

    - ref: get_detection_details
      action: core.http_request
      args:
        url: \${{ SECRETS.crowdstrike.BASE_URL }}/detects/entities/summaries/GET/v1
        method: POST
        headers:
          Authorization: "Bearer \${{ ACTIONS.authenticate.result.access_token }}"
          Content-Type: application/json
        payload:
          ids:
            - \${{ TRIGGER.data.detection_id }}
      depends_on: [authenticate]

    - ref: get_device_info
      action: core.http_request
      args:
        url: \${{ SECRETS.crowdstrike.BASE_URL }}/devices/entities/devices/v2
        method: GET
        headers:
          Authorization: "Bearer \${{ ACTIONS.authenticate.result.access_token }}"
        params:
          ids: \${{ TRIGGER.data.host_id }}
      depends_on: [authenticate]

    - ref: get_iocs
      action: core.http_request
      args:
        url: \${{ SECRETS.crowdstrike.BASE_URL }}/indicators/queries/iocs/v1
        method: GET
        headers:
          Authorization: "Bearer \${{ ACTIONS.authenticate.result.access_token }}"
        params:
          filter: "device.device_id:'\${{ TRIGGER.data.host_id }}'"
          limit: "50"
      depends_on: [authenticate]

    - ref: get_network_connections
      action: core.http_request
      args:
        url: \${{ SECRETS.crowdstrike.BASE_URL }}/detects/entities/processes/v1
        method: GET
        headers:
          Authorization: "Bearer \${{ ACTIONS.authenticate.result.access_token }}"
        params:
          ids: \${{ ACTIONS.get_detection_details.result.resources[0].behaviors[0].process_id }}
      depends_on: [get_detection_details]

    - ref: compile_evidence
      action: core.transform.reshape
      args:
        value:
          case_summary:
            detection: \${{ ACTIONS.get_detection_details.result.resources[0] }}
            device:
              hostname: \${{ ACTIONS.get_device_info.result.resources[0].hostname }}
              os: \${{ ACTIONS.get_device_info.result.resources[0].os_version }}
              last_seen: \${{ ACTIONS.get_device_info.result.resources[0].last_seen }}
              external_ip: \${{ ACTIONS.get_device_info.result.resources[0].external_ip }}
            iocs: \${{ ACTIONS.get_iocs.result.resources }}
            network: \${{ ACTIONS.get_network_connections.result }}
          collected_at: \${{ FN.now() }}
      depends_on: [get_detection_details, get_device_info, get_iocs, get_network_connections]`,
  },
  {
    id: "virustotal_url_enrichment",
    title: "VirusTotal URL Enrichment",
    description: "Submit a URL to VirusTotal for scanning, retrieve analysis results, and evaluate verdict. Source: Tracecat official docs + Discord community.",
    category: "enrichment",
    actions: 3,
    yaml: `# VirusTotal URL Enrichment
# Source: Tracecat official documentation + Discord community patterns
# Trigger: webhook with { "url": "https://suspicious-site.com" }
# Secrets required: virustotal (keys: API_KEY)
# Note: VT URL lookup requires base64url encoding of the URL

definition:
  title: VirusTotal URL Enrichment
  description: Scan a URL with VirusTotal and return analysis verdict

  triggers:
    - type: webhook
      ref: url_to_scan

  actions:
    - ref: encode_and_lookup
      action: core.http_request
      args:
        url: "https://www.virustotal.com/api/v3/urls/\${{ FN.strip(FN.to_base64url(TRIGGER.data.url)) }}"
        method: GET
        headers:
          x-apikey: \${{ SECRETS.virustotal.API_KEY }}
          Accept: application/json

    - ref: extract_verdict
      action: core.transform.reshape
      args:
        value:
          url: \${{ TRIGGER.data.url }}
          malicious: \${{ ACTIONS.encode_and_lookup.result.data.attributes.last_analysis_stats.malicious }}
          suspicious: \${{ ACTIONS.encode_and_lookup.result.data.attributes.last_analysis_stats.suspicious }}
          harmless: \${{ ACTIONS.encode_and_lookup.result.data.attributes.last_analysis_stats.harmless }}
          total: \${{ ACTIONS.encode_and_lookup.result.data.attributes.last_analysis_stats.malicious + ACTIONS.encode_and_lookup.result.data.attributes.last_analysis_stats.suspicious + ACTIONS.encode_and_lookup.result.data.attributes.last_analysis_stats.harmless }}
          categories: \${{ ACTIONS.encode_and_lookup.result.data.attributes.categories }}
          is_malicious: \${{ ACTIONS.encode_and_lookup.result.data.attributes.last_analysis_stats.malicious > 3 }}
      depends_on: [encode_and_lookup]

    - ref: create_alert_case
      action: core.cases.create_case
      args:
        case_title: "[VT URL] Malicious URL detected: \${{ TRIGGER.data.url }}"
        priority: high
        malice: malicious
        status: new
        payload:
          url: \${{ TRIGGER.data.url }}
          vt_malicious: \${{ ACTIONS.extract_verdict.result.malicious }}
          vt_suspicious: \${{ ACTIONS.extract_verdict.result.suspicious }}
      run_if: \${{ ACTIONS.extract_verdict.result.is_malicious }}
      depends_on: [extract_verdict]`,
  },
  {
    id: "crowdsec_ip_blocker",
    title: "CrowdSec IP Blocker",
    description: "Add a malicious IP to CrowdSec blocklist with a timed ban decision. Source: Discord community contributors.",
    category: "threat_response",
    actions: 2,
    yaml: `# CrowdSec IP Blocker
# Source: Tracecat Discord community contributors
# Trigger: webhook with { "ip_address": "x.x.x.x", "reason": "...", "duration": "24h" }
# Secrets required: crowdsec (keys: API_TOKEN)

definition:
  title: CrowdSec IP Blocker
  description: Add a malicious IP to CrowdSec blocklist with a timed ban

  triggers:
    - type: webhook
      ref: block_request

  actions:
    - ref: add_decision
      action: core.http_request
      args:
        url: "https://admin.api.crowdsec.net/v1/decisions"
        method: POST
        headers:
          x-api-key: \${{ SECRETS.crowdsec.API_TOKEN }}
          Content-Type: application/json
        payload:
          - scope: ip
            value: \${{ TRIGGER.data.ip_address }}
            type: ban
            duration: \${{ TRIGGER.data.duration }}
            origin: tracecat
            scenario: "manual block via SOAR"

    - ref: confirm_block
      action: core.transform.reshape
      args:
        value:
          status: blocked
          ip: \${{ TRIGGER.data.ip_address }}
          reason: \${{ TRIGGER.data.reason }}
          duration: \${{ TRIGGER.data.duration }}
          decision_id: \${{ ACTIONS.add_decision.result }}
      depends_on: [add_decision]`,
  },
  {
    id: "phishing_response",
    title: "Phishing Email Response",
    description: "Analyze a reported phishing email: extract IOCs, check URLs with VirusTotal, evaluate verdict, create case, and notify SOC. Source: Tracecat official website and documentation.",
    category: "incident_response",
    actions: 6,
    yaml: `# Phishing Email Response
# Source: Tracecat official website (https://tracecat.com) and documentation
# Trigger: webhook with { "from": "...", "subject": "...", "body": "...", "urls": [...], "reporter": "..." }
# Secrets required: virustotal (keys: API_KEY), slack (keys: BOT_TOKEN)

definition:
  title: Phishing Email Response
  description: Analyze reported phishing emails, check URLs, verdict, create case and notify

  triggers:
    - type: webhook
      ref: reported_email

  actions:
    - ref: parse_email
      action: core.transform.reshape
      args:
        value:
          sender: \${{ TRIGGER.data.from }}
          subject: \${{ TRIGGER.data.subject }}
          urls: \${{ TRIGGER.data.urls }}
          reporter: \${{ TRIGGER.data.reporter }}
          received_at: \${{ FN.now() }}

    - ref: check_urls_vt
      action: core.http_request
      args:
        url: "https://www.virustotal.com/api/v3/urls/\${{ FN.strip(FN.to_base64url(var.url)) }}"
        method: GET
        headers:
          x-apikey: \${{ SECRETS.virustotal.API_KEY }}
          Accept: application/json
      control_flow:
        for_each: \${{ ACTIONS.parse_email.result.urls }}
        start_delay: 1
        retry_policy:
          max_attempts: 3
          timeout: 30
      depends_on: [parse_email]

    - ref: evaluate_verdict
      action: core.script.run_python
      args:
        script: |
          import json

          def main(vt_results_json, sender):
              vt_results = json.loads(vt_results_json)
              total_malicious = 0
              malicious_urls = []
              for r in vt_results:
                  if isinstance(r, dict) and "data" in r:
                      stats = r["data"].get("attributes", {}).get("last_analysis_stats", {})
                      mal = stats.get("malicious", 0)
                      total_malicious += mal
                      if mal > 0:
                          malicious_urls.append(r["data"]["id"])
              is_phishing = total_malicious > 2
              return {
                  "is_phishing": is_phishing,
                  "total_malicious_detections": total_malicious,
                  "malicious_urls": malicious_urls,
                  "confidence": "high" if total_malicious > 5 else "medium" if total_malicious > 0 else "low"
              }
        inputs:
          vt_results_json: \${{ FN.serialize_json(ACTIONS.check_urls_vt.result) }}
          sender: \${{ ACTIONS.parse_email.result.sender }}
      depends_on: [check_urls_vt]

    - ref: create_phishing_case
      action: core.cases.create_case
      args:
        case_title: "[PHISH] \${{ ACTIONS.parse_email.result.subject }}"
        priority: \${{ FN.conditional(ACTIONS.evaluate_verdict.result.is_phishing, "high", "medium") }}
        malice: \${{ FN.conditional(ACTIONS.evaluate_verdict.result.is_phishing, "malicious", "unknown") }}
        status: new
        payload:
          sender: \${{ ACTIONS.parse_email.result.sender }}
          subject: \${{ ACTIONS.parse_email.result.subject }}
          reporter: \${{ ACTIONS.parse_email.result.reporter }}
          malicious_urls: \${{ ACTIONS.evaluate_verdict.result.malicious_urls }}
          confidence: \${{ ACTIONS.evaluate_verdict.result.confidence }}
      depends_on: [evaluate_verdict]

    - ref: add_evidence_comment
      action: core.cases.create_comment
      args:
        case_id: \${{ ACTIONS.create_phishing_case.result.id }}
        content: "VT Analysis: \${{ ACTIONS.evaluate_verdict.result.total_malicious_detections }} malicious detections across \${{ FN.length(ACTIONS.parse_email.result.urls) }} URLs. Confidence: \${{ ACTIONS.evaluate_verdict.result.confidence }}. Malicious URLs: \${{ FN.serialize_json(ACTIONS.evaluate_verdict.result.malicious_urls) }}"
      depends_on: [create_phishing_case]

    - ref: notify_soc
      action: core.http_request
      args:
        url: https://slack.com/api/chat.postMessage
        method: POST
        headers:
          Authorization: "Bearer \${{ SECRETS.slack.BOT_TOKEN }}"
          Content-Type: application/json
        payload:
          channel: "#soc-alerts"
          blocks:
            - type: header
              text:
                type: plain_text
                text: "Phishing Report: \${{ ACTIONS.parse_email.result.subject }}"
            - type: section
              fields:
                - type: mrkdwn
                  text: "*Sender:*\\n\${{ ACTIONS.parse_email.result.sender }}"
                - type: mrkdwn
                  text: "*Verdict:*\\n\${{ FN.conditional(ACTIONS.evaluate_verdict.result.is_phishing, 'PHISHING', 'CLEAN') }}"
                - type: mrkdwn
                  text: "*Confidence:*\\n\${{ ACTIONS.evaluate_verdict.result.confidence }}"
                - type: mrkdwn
                  text: "*Reporter:*\\n\${{ ACTIONS.parse_email.result.reporter }}"
      depends_on: [create_phishing_case]`,
  },
  {
    id: "siem_alert_triage",
    title: "Generic SIEM Alert Triage",
    description: "Receive SIEM alerts, check if source IP is public, enrich with VirusTotal, score severity, and create a case. Source: Tracecat Discord + community patterns.",
    category: "alert_management",
    actions: 4,
    yaml: `# Generic SIEM Alert Triage
# Source: Tracecat Discord community + common SOAR patterns
# Trigger: webhook with { "alert_name": "...", "src_ip": "...", "severity": "...", "raw_log": "..." }
# Secrets required: virustotal (keys: API_KEY)

definition:
  title: Generic SIEM Alert Triage
  description: Triage SIEM alerts with IP enrichment and automated case creation

  triggers:
    - type: webhook
      ref: siem_alert

  actions:
    - ref: check_ip_type
      action: core.transform.reshape
      args:
        value:
          alert_name: \${{ TRIGGER.data.alert_name }}
          src_ip: \${{ TRIGGER.data.src_ip }}
          severity: \${{ TRIGGER.data.severity }}
          is_public: \${{ FN.ipv4_is_public(TRIGGER.data.src_ip) }}

    - ref: enrich_with_vt
      action: core.http_request
      args:
        url: "https://www.virustotal.com/api/v3/ip_addresses/\${{ ACTIONS.check_ip_type.result.src_ip }}"
        method: GET
        headers:
          x-apikey: \${{ SECRETS.virustotal.API_KEY }}
          Accept: application/json
      run_if: \${{ ACTIONS.check_ip_type.result.is_public }}
      depends_on: [check_ip_type]

    - ref: score_alert
      action: core.transform.reshape
      args:
        value:
          alert_name: \${{ ACTIONS.check_ip_type.result.alert_name }}
          src_ip: \${{ ACTIONS.check_ip_type.result.src_ip }}
          is_public: \${{ ACTIONS.check_ip_type.result.is_public }}
          vt_malicious: \${{ FN.conditional(ACTIONS.check_ip_type.result.is_public, ACTIONS.enrich_with_vt.result.data.attributes.last_analysis_stats.malicious, 0) }}
          priority: \${{ FN.conditional(TRIGGER.data.severity == "critical", "critical", FN.conditional(TRIGGER.data.severity == "high", "high", FN.conditional(TRIGGER.data.severity == "medium", "medium", "low"))) }}
          malice: \${{ FN.conditional(ACTIONS.check_ip_type.result.is_public && ACTIONS.enrich_with_vt.result.data.attributes.last_analysis_stats.malicious > 5, "malicious", "unknown") }}
      depends_on: [enrich_with_vt]

    - ref: create_triage_case
      action: core.cases.create_case
      args:
        case_title: "[SIEM] \${{ ACTIONS.score_alert.result.alert_name }}"
        priority: \${{ ACTIONS.score_alert.result.priority }}
        malice: \${{ ACTIONS.score_alert.result.malice }}
        status: new
        payload:
          src_ip: \${{ ACTIONS.score_alert.result.src_ip }}
          is_public_ip: \${{ ACTIONS.score_alert.result.is_public }}
          vt_malicious: \${{ ACTIONS.score_alert.result.vt_malicious }}
          original_severity: \${{ TRIGGER.data.severity }}
          raw_log: \${{ TRIGGER.data.raw_log }}
      depends_on: [score_alert]`,
  },
];

export function registerTemplateTools(server: McpServer, _client: TracecatClient) {
  server.tool(
    "tracecat_list_templates",
    "List available SOAR workflow templates. Returns template ID, title, description, category, and action count for each template.",
    {},
    async () => {
      if (TEMPLATES.length === 0) {
        return {
          content: [{ type: "text", text: "No templates available yet. Templates from official Tracecat documentation and community sources will be added here." }],
        };
      }
      const list = TEMPLATES.map(({ id, title, description, category, actions }) => ({
        id, title, description, category, actions,
      }));
      return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_template",
    "Get the full YAML template for a SOAR workflow pattern. Use tracecat_list_templates to see available template IDs.",
    {
      template_id: z.string().describe("Template ID from tracecat_list_templates"),
    },
    async ({ template_id }) => {
      const template = TEMPLATES.find((t) => t.id === template_id);
      if (!template) {
        const available = TEMPLATES.map((t) => t.id).join(", ") || "(none)";
        return {
          content: [{ type: "text", text: `Unknown template: ${template_id}. Available templates: ${available}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: `# Template: ${template.title}\n\n${template.description}\n\n${template.yaml}` }],
      };
    }
  );
}
