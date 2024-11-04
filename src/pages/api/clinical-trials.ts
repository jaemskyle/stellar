// src/pages/api/clinical-trials.ts
import type { APIRoute } from "astro";

interface StudyInfo {
  studyTitle: string;
  nctNumber: string;
  status: string;
  startDate: string;
  completionDate: string;
  conditions: string;
  interventions: string;
  sponsor: string;
  studyType: string;
  briefSummary: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const params = await request.json();

    // Implement the getClinicalTrials logic here
    const getClinicalTrials = async (params: any): Promise<StudyInfo[]> => {
      // Add your implementation for fetching trials
      // This is where you'd make the actual API call to your trials database
      const mockTrials: StudyInfo[] = [
        {
          studyTitle: "Example Clinical Trial",
          nctNumber: "NCT00000000",
          status: "Recruiting",
          startDate: "2024-01-01",
          completionDate: "2025-01-01",
          conditions: "Example Condition",
          interventions: "Example Treatment",
          sponsor: "Example Hospital",
          studyType: "Interventional",
          briefSummary: "This is an example clinical trial.",
        },
      ];

      return mockTrials;
    };

    const trials = await getClinicalTrials(params);

    return new Response(
      JSON.stringify({
        status: "success",
        resultCount: trials.length,
        trials,
        message: `Successfully retrieved ${trials.length} clinical trials matching your criteria.`,
        summary:
          trials.length > 0
            ? `Found ${trials.length} trials. The first trial is "${trials[0].studyTitle}" (${trials[0].nctNumber}).`
            : "No matching trials found with the current criteria.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching trials:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        error: "Failed to fetch clinical trials",
        message:
          "I apologize, but there was an error retrieving the clinical trials.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};
