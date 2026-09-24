import os
import sys
import asyncio
sys.path.insert(0, os.path.abspath("."))

from backend.app.core.database import SessionLocal
from backend.app.models.candidate import Candidate
from backend.app.models.job import JobDescription
from backend.app.models.match import CandidateJobMatch
from backend.app.services.normalization_service import CandidateNormalizer, SkillNormalizer
from backend.app.matching.pipeline import MatchingPipeline
from backend.app.ai.llm.sarvam_provider import SarvamProvider

async def main():
    db = SessionLocal()
    provider = SarvamProvider()

    # 1. Update JDs structured_data
    jobs = db.query(JobDescription).all()
    print(f"Updating {len(jobs)} JDs...", flush=True)
    for j in jobs:
        if j.raw_text:
            parsed = provider._fallback_extract_jd(j.raw_text)
            parsed["job_id"] = j.job_id
            j.structured_data = parsed
            db.add(j)
    db.commit()

    # 2. Re-normalize candidates
    candidates = db.query(Candidate).all()
    print(f"Updating {len(candidates)} candidates...", flush=True)
    for c in candidates:
        cand_data = c.candidate_data or {}
        cand_data["normalized"] = CandidateNormalizer.normalize(cand_data)
        c.candidate_data = cand_data
        db.add(c)
    db.commit()

    # 3. Re-run matching pipeline for each candidate
    pipeline = MatchingPipeline(db)
    print("Re-running matching pipeline...", flush=True)
    for c in candidates:
        print(f"Running pipeline for {c.candidate_id}...", flush=True)
        try:
            await pipeline.run_for_candidate(c.candidate_id, trigger_type="MANUAL_RESCORE")
            print(f"Finished pipeline for {c.candidate_id}", flush=True)
        except Exception as e:
            print(f"Error matching {c.candidate_id}: {e}", flush=True)

    # 4. Verify Siva Ram (CAND-01KAD0BE70A6B3C)
    siva_matches = db.query(CandidateJobMatch).filter(CandidateJobMatch.candidate_id == 'CAND-01KAD0BE70A6B3C').all()
    print(f"\n--- SIVA RAM MATCHES ({len(siva_matches)}) ---")
    for m in siva_matches:
        j = db.query(JobDescription).filter(JobDescription.job_id == m.job_id).first()
        title = j.title if j and hasattr(j, 'title') else (j.structured_data.get('job_title') if j and j.structured_data else m.job_id)
        print(f"\nJob: {m.job_id} - {title} | Score: {m.overall_score}% | Status: {m.status}")
        print("  MATCHED Evidence:")
        for me in (m.matched_requirements or []):
            print(f"    ✓ {me.get('requirement')}: {me.get('candidate_evidence')}")
        print("  MISSING Evidence:")
        for mi in (m.missing_requirements or []):
            print(f"    X {mi.get('requirement')}: {mi.get('candidate_evidence')}")
        print("  PARTIAL Evidence:")
        for mp in (m.partial_requirements or []):
            print(f"    ~ {mp.get('requirement')}: {mp.get('candidate_evidence')}")

    db.close()

if __name__ == "__main__":
    asyncio.run(main())
