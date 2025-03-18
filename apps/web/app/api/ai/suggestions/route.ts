import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// const configuration = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY,
// });


export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { code, language, cursorPosition, context } = await req.json();
    console.log("code", code);
    console.log("language", language);
    console.log("cursorPosition", cursorPosition);
    console.log("context", context);
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Prepare the prompt for the AI
    const prompt = `
You are an expert ${language || 'JavaScript'} developer assisting with code generation.

TASK:
Generate the complete code that should follow from the current cursor position. Continue the code in a logical way that completes the current functionality.

RULES:
- Generate ALL the code that should appear from the cursor position onwards
- Your code should complete the current function, class, or block in a meaningful way
- If multiple implementations are possible, choose the most logical one based on existing code
- Maintain consistent style, naming conventions, and patterns from the existing code
- Include any necessary closing brackets, parentheses, or other syntax elements
- If appropriate, add error handling, comments, or documentation
- The code should be production-ready and follow best practices for ${language || 'JavaScript'}
- Return ONLY the raw code - no explanations, markdown, or backticks
- If the code is in JavaScript, take the input similar to the below example:
const input = require("fs").readFileSync("/dev/stdin").toString().trim();
const [rawArr, rawTarget] = input.split("\n");
const arr = rawArr.split(" ").map(Number); // Convert array elements to numbers
const target = Number(rawTarget); // Convert target to a number



Code context:
\`\`\`${language || 'javascript'}
${code}
\`\`\`

Current cursor position: line ${cursorPosition?.lineNumber || 'unknown'}, column ${cursorPosition?.column || 'unknown'}

Additional context: ${context || 'None provided'}

Remember: Return ONLY the raw code that should come after the cursor position - no explanations, no backticks.
`;

    // Call OpenAI API
    
   const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 150,
    temperature: 0.3,
    top_p: 1,
   })

    // Extract the suggestion
    const suggestion = response.choices[0]?.message.content?.trim() || '';
    
    // Clean up the suggestion to remove markdown code blocks if present
    let cleanedSuggestion = suggestion;
    
    // Remove markdown code block formatting if present
    const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/;
    const match = suggestion.match(codeBlockRegex);
    if (match && match[1]) {
      cleanedSuggestion = match[1].trim();
    }

    return NextResponse.json({ suggestion: cleanedSuggestion }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error: any) {
    console.error('Error generating AI suggestion:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating the suggestion', details: error.message || String(error) },
      { status: 500 }
    );
  }
} 