// ============================================================
// India Pincode Service (Free Stack: India Post API)
// Fetches official Post Office Localities, District, and State
// ============================================================

import axios from "axios";

export interface PincodeLocationInfo {
  pincode: string;
  area: string;
  city: string;
  state: string;
  availableAreas: string[];
}

export const pincodeService = {
  async getLocationByPincode(pincode: string): Promise<PincodeLocationInfo | null> {
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return null;
    }

    try {
      const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = response.data;
      if (Array.isArray(data) && data[0]?.Status === "Success" && Array.isArray(data[0].PostOffice)) {
        const postOffices = data[0].PostOffice;
        if (postOffices.length > 0) {
          const first = postOffices[0];
          const availableAreas: string[] = Array.from(new Set(postOffices.map((po: any) => String(po.Name || ""))));
          return {
            pincode,
            area: first.Name || "",
            city: first.District || first.Division || "",
            state: first.State || "",
            availableAreas,
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  },
};
