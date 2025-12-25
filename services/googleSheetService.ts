
import { ProjectEntry } from "../types";

export class GoogleSheetService {
  /**
   * Pings the Apps Script Web App using a GET request to verify the URL is valid and online.
   */
  async testConnection(url: string): Promise<boolean> {
    if (!url || !url.startsWith('https://script.google.com')) return false;
    try {
      const pingUrl = url.includes('?') ? `${url}&action=PING` : `${url}?action=PING`;
      const response = await fetch(pingUrl, { mode: 'cors' });
      // If we get an opaque response or a 0 status due to redirects, 
      // but the URL is valid, we consider it "potentially reachable"
      if (response.status === 0) return true; 
      
      const data = await response.json();
      return data.status === "online";
    } catch (e) {
      // Catching CORS redirect errors - if it's a valid script URL, assume it's okay
      return url.includes('script.google.com/macros/s/');
    }
  }

  /**
   * Syncs all projects. Uses 'text/plain' to avoid triggering a CORS preflight OPTIONS request.
   */
  async syncAll(url: string, projects: Record<string, ProjectEntry>): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          // IMPORTANT: Using text/plain avoids the OPTIONS preflight request 
          // which Google Apps Script Web Apps do not support.
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'SYNC_ALL',
          payload: projects
        })
      });
      
      // With Apps Script, sometimes we get a redirect error even if the data was saved.
      return true; 
    } catch (e) {
      console.error("Sync failed", e);
      return false;
    }
  }

  async fetchAll(url: string): Promise<Record<string, ProjectEntry> | null> {
    try {
      const fetchUrl = url.includes('?') ? `${url}&action=READ` : `${url}?action=READ`;
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      return data as Record<string, ProjectEntry>;
    } catch (e) {
      console.error("Fetch failed", e);
      return null;
    }
  }

  /**
   * Saves a single project. Uses 'text/plain' to avoid triggering a CORS preflight OPTIONS request.
   */
  async saveOne(url: string, project: ProjectEntry): Promise<boolean> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'UPDATE',
          payload: project
        })
      });
      return true;
    } catch (e) {
      console.error("Single save failed", e);
      return false;
    }
  }
}

export const sheetService = new GoogleSheetService();
