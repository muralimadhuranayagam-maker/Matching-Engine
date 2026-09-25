"""
JobShop Matching Engine — AI Interview & Form MCP Server
Provides standard MCP (Model Context Protocol) tools for AI Voice Agents (SnapServe)
to read candidate form data, dynamically generate screening questions based ONLY on form data
during live calls, record candidate answers, finalize the interview session, and compare
full candidate data (form + interview transcript) against Job Descriptions at the end.
"""

import sys
import json
import asyncio
import logging
from typing import Dict, Any, Optional

from backend.app.core.database import SessionLocal
from backend.app.services.interview_service import InterviewService
from backend.app.services.intake_form_service import IntakeFormService
from backend.app.models.candidate import Candidate

# Configure logging to stderr so stdout remains clean for MCP JSON-RPC
logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("InterviewMCPServer")

# ------------------------------------------------------------
# Tool Definitions Schema
# ------------------------------------------------------------
MCP_TOOLS = [
    {
        "name": "get_next_form_field",
        "description": "Checks candidate's intake form and returns the NEXT unfilled field metadata (field_path, display_name, field_type, description, options, required) so the AI Voice Agent can naturally ask for it.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "candidate_id": {
                    "type": "string",
                    "description": "Candidate ID (e.g., 'CAND-01K8F...')"
                }
            },
            "required": ["candidate_id"]
        }
    },
    {
        "name": "submit_form_field_answer",
        "description": "Receives candidate's spoken answer for a form field (e.g. 'My name is Shiva'), extracts and stores it in backend PostgreSQL, and returns the next unfilled field metadata.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "candidate_id": {
                    "type": "string",
                    "description": "Candidate ID"
                },
                "field_path": {
                    "type": "string",
                    "description": "Field path being answered (e.g., 'personal.first_name', 'contact.phone', 'professional_profile.skill', 'salary.expected_monthly_salary')"
                },
                "candidate_answer": {
                    "type": "string",
                    "description": "Candidate's spoken or text answer (e.g. 'My name is Shiva', '9845012345', 'Python and PostgreSQL')"
                }
            },
            "required": ["candidate_id", "field_path", "candidate_answer"]
        }
    },
    {
        "name": "get_intake_form_state",
        "description": "Retrieves the current full state of the candidate's intake form (all filled fields, missing fields, and completion percentage).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "candidate_id": {
                    "type": "string",
                    "description": "Candidate ID"
                }
            },
            "required": ["candidate_id"]
        }
    },
    {
        "name": "complete_and_match_form",
        "description": "Marks the intake form completed and immediately runs the Matching Engine across ALL active Job Descriptions (JDs) using the complete candidate profile.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "candidate_id": {
                    "type": "string",
                    "description": "Candidate ID"
                }
            },
            "required": ["candidate_id"]
        }
    },
    {
        "name": "get_candidate_form_context",
        "description": "Fetches complete structured intake form data for a candidate (skills, education, employment history, address, shift preference, expected salary).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "candidate_id": {
                    "type": "string",
                    "description": "Unique ID of candidate (e.g., 'CAND-01K8F...')"
                }
            },
            "required": ["candidate_id"]
        }
    },
    {
        "name": "generate_interview_questions",
        "description": "Generates dynamic screening questions tailored to the candidate's intake form data during the live interview call.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "candidate_id": {
                    "type": "string",
                    "description": "Unique ID of the candidate"
                },
                "session_id": {
                    "type": "string",
                    "description": "Optional session ID for the interview call"
                }
            },
            "required": ["candidate_id"]
        }
    },
    {
        "name": "record_candidate_answer",
        "description": "Stores a candidate's spoken or text response to an interview question in the backend interview session in real-time.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "Active interview session ID (e.g. 'INT-ABC12345')"
                },
                "question_id": {
                    "type": "string",
                    "description": "Identifier of the question answered (e.g. 'q1', 'q2')"
                },
                "question": {
                    "type": "string",
                    "description": "Text of the interview question asked"
                },
                "candidate_answer": {
                    "type": "string",
                    "description": "Candidate's spoken or text answer"
                }
            },
            "required": ["session_id", "question_id", "question", "candidate_answer"]
        }
    },
    {
        "name": "finalize_candidate_interview",
        "description": "Finalizes the interview call, attaches full transcript to candidate profile, and triggers Matching Engine across ALL active Job Descriptions using the complete data.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "The interview session ID to finalize"
                }
            },
            "required": ["session_id"]
        }
    },
    {
        "name": "compare_candidate_with_jd",
        "description": "Evaluates full candidate data (intake form + interview transcript) against a specific Job Description, returning match score and strengths/gaps.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "candidate_id": {
                    "type": "string",
                    "description": "Candidate ID"
                },
                "job_id": {
                    "type": "string",
                    "description": "Target Job ID"
                },
                "session_id": {
                    "type": "string",
                    "description": "Optional interview session ID"
                }
            },
            "required": ["candidate_id", "job_id"]
        }
    },
    {
        "name": "get_job_requirements",
        "description": "Fetches target Job Description requirements (required & preferred skills, experience range, responsibilities, minimum qualification, location, shift type).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "job_id": {
                    "type": "string",
                    "description": "Unique ID of the job posting (e.g., 'JOB-01K9...')"
                }
            },
            "required": ["job_id"]
        }
    },
    {
        "name": "update_candidate_form_field",
        "description": "Updates or corrects a candidate intake form field during the live interview call.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "candidate_id": {
                    "type": "string",
                    "description": "Unique candidate ID"
                },
                "field_path": {
                    "type": "string",
                    "description": "Dot-notation path of field to update (e.g., 'professional_profile.total_experience_months', 'salary.expected_monthly_salary')"
                },
                "value": {
                    "description": "New value to assign to the field"
                }
            },
            "required": ["candidate_id", "field_path", "value"]
        }
    }
]

# ------------------------------------------------------------
# Tool Execution Handlers
# ------------------------------------------------------------
async def handle_tool_call(name: str, arguments: Dict[str, Any]) -> Any:
    db = SessionLocal()
    interview_svc = InterviewService(db)
    intake_svc = IntakeFormService(db)
    try:
        # --- Dedicated Intake Form Tools ---
        if name == "get_next_form_field":
            return intake_svc.get_next_form_field(arguments["candidate_id"])
        
        elif name == "submit_form_field_answer":
            return intake_svc.submit_form_field_answer(
                candidate_id=arguments["candidate_id"],
                field_path=arguments["field_path"],
                candidate_answer=arguments["candidate_answer"]
            )
        
        elif name == "get_intake_form_state":
            return intake_svc.get_intake_form_state(arguments["candidate_id"])

        elif name == "complete_and_match_form":
            return await intake_svc.complete_and_match_form(arguments["candidate_id"])

        # --- Candidate Form Context & Interview Tools ---
        elif name == "get_candidate_form_context":
            return interview_svc.get_candidate_form_context(arguments["candidate_id"])
        
        elif name == "generate_interview_questions":
            return await interview_svc.generate_interview_questions(
                candidate_id=arguments["candidate_id"],
                session_id=arguments.get("session_id")
            )
        
        elif name == "record_candidate_answer":
            return interview_svc.record_candidate_answer(
                session_id=arguments["session_id"],
                question_id=arguments["question_id"],
                question=arguments["question"],
                candidate_answer=arguments["candidate_answer"]
            )
        
        elif name == "finalize_candidate_interview":
            return await interview_svc.finalize_candidate_interview(
                session_id=arguments["session_id"]
            )

        elif name == "compare_candidate_with_jd":
            return await interview_svc.compare_candidate_with_jd(
                candidate_id=arguments["candidate_id"],
                job_id=arguments["job_id"],
                session_id=arguments.get("session_id")
            )
        
        elif name == "get_job_requirements":
            return interview_svc.get_job_requirements(arguments["job_id"])
        
        elif name == "update_candidate_form_field":
            cand_id = arguments["candidate_id"]
            field_path = arguments["field_path"]
            val = arguments["value"]

            c = db.query(Candidate).filter(Candidate.candidate_id == cand_id).first()
            if not c:
                raise ValueError(f"Candidate '{cand_id}' not found.")

            data = dict(c.candidate_data or {})
            parts = field_path.split(".")
            curr = data
            for p in parts[:-1]:
                if p not in curr or not isinstance(curr[p], dict):
                    curr[p] = {}
                curr = curr[p]
            curr[parts[-1]] = val

            c.candidate_data = data
            db.commit()

            return {
                "status": "SUCCESS",
                "candidate_id": cand_id,
                "updated_field": field_path,
                "new_value": val
            }

        else:
            raise ValueError(f"Unknown MCP tool: '{name}'")
    finally:
        db.close()


# ------------------------------------------------------------
# MCP Protocol JSON-RPC stdio Transport Loop
# ------------------------------------------------------------
async def run_stdio_server():
    logger.info("JobShop AI Interview & Form MCP Server started on stdio.")
    loop = asyncio.get_event_loop()
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await loop.connect_read_pipe(lambda: protocol, sys.stdin)

    while True:
        try:
            line_bytes = await reader.readline()
            if not line_bytes:
                break
            
            line = line_bytes.decode("utf-8").strip()
            if not line:
                continue

            try:
                request = json.loads(line)
            except json.JSONDecodeError as err:
                logger.error(f"Invalid JSON received: {err}")
                continue

            req_id = request.get("id")
            method = request.get("method")
            params = request.get("params", {})

            if method == "initialize":
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {
                            "tools": {}
                        },
                        "serverInfo": {
                            "name": "jobshop-interview-agent",
                            "version": "1.0.0"
                        }
                    }
                }
            elif method == "notifications/initialized":
                continue
            elif method == "ping":
                response = {"jsonrpc": "2.0", "id": req_id, "result": {}}
            elif method == "tools/list":
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "tools": MCP_TOOLS
                    }
                }
            elif method == "tools/call":
                tool_name = params.get("name")
                tool_args = params.get("arguments", {})
                try:
                    tool_result = await handle_tool_call(tool_name, tool_args)
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": json.dumps(tool_result, indent=2, default=str)
                                }
                            ],
                            "isError": False
                        }
                    }
                except Exception as ex:
                    logger.error(f"Error executing tool {tool_name}: {ex}", exc_info=True)
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"Error executing tool '{tool_name}': {str(ex)}"
                                }
                            ],
                            "isError": True
                        }
                    }
            else:
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method '{method}' not found"
                    }
                }

            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()

        except Exception as e:
            logger.error(f"Server loop error: {e}", exc_info=True)


def main():
    asyncio.run(run_stdio_server())

if __name__ == "__main__":
    main()
