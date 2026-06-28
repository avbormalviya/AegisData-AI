from langgraph.prebuilt import ToolNode
from langchain_core.messages import SystemMessage, AIMessage
from app.services.llm import llm
from app.tools.sql_tool import sql_query_tool
from app.tools.csv_tool import csv_query_tool
from app.tools.code_tool import code_tool
from app.tools.chart_tool import chart_tool


SYSTEM_PROMPT = """You are a helpful data analyst assistant. You can:
- Query SQL databases (when no file is uploaded)
- Analyze uploaded CSV/Excel files
- Write and execute code for data analysis, or write code in other languages
- Create charts or plot to visualize data

For casual conversation or general questions unrelated to data, just respond
naturally without using any tools.

When a user asks for analysis or a chart, retrieve the data first using the
appropriate tool, then use that data for any chart or further analysis.

FORMATTING RULES:
- Respond in clean markdown.
- Always wrap code in triple backticks with the language specified.
- Use bullet points or **bold** for key insights.
- Keep responses concise.
- Write naturally — explain before and after code blocks like you're
  walking a colleague through your thinking, not just dumping output.
- If you called chart_tool and want to show that chart in your response,
  insert the exact text [CHART_HERE] at the point where the chart should
  appear, with explanation before and after it.
- Include tools results in the response as a markdown code block with the correct language tag."""


tools = [sql_query_tool, csv_query_tool, code_tool, chart_tool]

llm_with_tools = llm.bind_tools(tools)
tool_node = ToolNode(tools)


def agent_node(state):
    """
    Main agent node that uses LLM with tools
    """
    messages = state['messages']

    if not any(isinstance(m, SystemMessage) for m in messages):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages

    try:
      response = llm_with_tools.invoke(messages)
    except Exception as e:
      import traceback
      traceback.print_exc()
      return {"messages": [AIMessage(content="An error occurred. Please try again.")]}

    return {"messages": [response]}