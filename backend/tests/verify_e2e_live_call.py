"""
End-to-End Live Call Simulation Test for SnapServe AI HR Voice Agent Intake Integration.
Verifies all 13 candidate speech scenarios via real WebSocket client + HTTP speech bridge.
"""
import asyncio
import json
import httpx
import websockets

BASE_HTTP_URL = "http://127.0.0.1:8000"
BASE_WS_URL = "ws://127.0.0.1:8000"
SESSION_ID = "e2e_test_session_siva"

TEST_UTTERANCES = [
    # 1. Name
    ("My name is Siva.", {"personal.first_name": "Siva"}),
    
    # 2. Experience
    ("I have 3 years experience.", {
        "professional_profile.work_status": "EXPERIENCED",
        "professional_profile.total_experience_years": 3
    }),
    
    # 3. Company
    ("I'm working at Infosys.", {"employment_history.current.company_name": "Infosys"}),
    
    # 4. Role
    ("I'm a .NET developer.", {"employment_history.current.role": ".NET developer"}),
    
    # 5. Compound statement (Multiple fields)
    ("I'm a .NET developer at Infosys with 3 years experience.", {
        "professional_profile.work_status": "EXPERIENCED",
        "professional_profile.total_experience_years": 3,
        "employment_history.current.company_name": "Infosys",
        "employment_history.current.role": ".NET developer"
    }),
    
    # 6. Skills
    ("I know React and Angular.", {"professional_profile.skill": ["React", "Angular"]}),
    
    # 7. Location
    ("I live in Chennai.", {"address.current.city": "Chennai"}),
    
    # 8. Education
    ("I completed B.E. Computer Science in 2024.", {
        "education.graduation.degree": "B.E. Computer Science",
        "education.graduation.passing_year": "2024"
    }),
    
    # 9. Shifts
    ("I prefer day shift.", {"job_preferences.shift_base": "Day shift only"}),
    
    # 10. Correction (Latest confirmed answer wins)
    ("Actually, I work at TCS.", {"employment_history.current.company_name": "TCS"}),
    
    # 11. Trigger conditional section
    ("I am experienced.", {"professional_profile.work_status": "EXPERIENCED"}),
    
    # 12. Newly opened sub-field
    ("My current salary is 6 lakhs.", {"employment_history.current.monthly_salary": 50000.0}),
    
    # 13. Dropdown/select answer naturally
    ("I am ready to relocate.", {"non_hiring_zone_details.will_relocate": "Yes"}),
]

async def run_e2e_test():
    print("=" * 60)
    print("STARTING E2E LIVE-CALL SIMULATION TEST")
    print(f"Connecting WebSocket client for session: {SESSION_ID}")
    print("=" * 60)
    
    ws_url = f"{BASE_WS_URL}/api/candidates/live-intake/{SESSION_ID}"
    
    async with websockets.connect(ws_url) as ws:
        # First message is INIT_SYNC
        init_raw = await ws.recv()
        init_msg = json.loads(init_raw)
        assert init_msg["type"] == "INIT_SYNC"
        print("[WS Client] Connected & received INIT_SYNC successfully!")
        
        async with httpx.AsyncClient() as client:
            step = 1
            for utterance, expected_subset in TEST_UTTERANCES:
                print(f"\n--- Turn {step}: Candidate says: \"{utterance}\" ---")
                
                # 1. Voice agent emits speech to bridge
                res = await client.post(
                    f"{BASE_HTTP_URL}/api/candidates/live-intake/{SESSION_ID}/speech",
                    json={"utterance": utterance},
                    timeout=10.0
                )
                assert res.status_code == 200, f"HTTP error: {res.text}"
                resp_data = res.json()
                print(f"[Bridge Response] Extracted: {resp_data['applied_updates']}")
                
                # 2. WebSocket client receives live update
                ws_raw = await ws.recv()
                ws_msg = json.loads(ws_raw)
                assert ws_msg["type"] == "FIELD_UPDATES"
                live_updates = ws_msg["updates"]
                print(f"[WS Client Received] Live Updates: {live_updates}")
                
                # 3. Assert raw transcript was NEVER sent in updates
                for k, v in live_updates.items():
                    assert v != utterance, f"Raw transcript leaked to UI field {k}!"
                
                # 4. Assert expected fields were populated
                for exp_k, exp_v in expected_subset.items():
                    assert exp_k in live_updates, f"Expected field {exp_k} missing in live updates!"
                    assert live_updates[exp_k] == exp_v, f"Field {exp_k} mismatch: {live_updates[exp_k]} != {exp_v}"
                
                print(f"[Turn {step} PASSED]")
                step += 1
                
            # Final cumulative state verification
            print("\n--- Verifying Cumulative Session State ---")
            state_res = await client.get(f"{BASE_HTTP_URL}/api/candidates/live-intake/{SESSION_ID}/state")
            assert state_res.status_code == 200
            final_state = state_res.json()["state"]
            
            # Check TCS correction won over Infosys
            assert final_state.get("employment_history.current.company_name") == "TCS", "Correction failed!"
            print(f"[State Check] Company Name correctly updated to: {final_state.get('employment_history.current.company_name')}")
            print(f"[State Check] Work status: {final_state.get('professional_profile.work_status')}")
            print(f"[State Check] Relocate: {final_state.get('non_hiring_zone_details.will_relocate')}")
            print(f"[State Check] Shift: {final_state.get('job_preferences.shift_base')}")
            print(f"[State Check] Skills: {final_state.get('professional_profile.skill')}")
            
    print("\n" + "=" * 60)
    print("ALL 13 LIVE-CALL SCENARIOS PASSED VERIFICATION!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
