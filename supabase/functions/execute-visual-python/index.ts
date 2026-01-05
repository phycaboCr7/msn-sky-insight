import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Visualization libraries that produce graphical output
const VISUAL_LIBRARIES = [
  'matplotlib', 'plt', 'pyplot',
  'turtle',
  'plotly',
  'seaborn', 'sns',
  'bokeh',
  'altair',
  'pygal',
  'pillow', 'PIL', 'Image',
  'cv2', 'opencv',
  'skimage',
  'pygame',
  'tkinter',
  'manim',
  'mayavi',
  'vispy',
  'vpython',
  'networkx',
  'wordcloud',
  'folium',
  'geopandas',
  'cartopy'
];

// Check if code contains visualization libraries
function containsVisualization(code: string): boolean {
  const lowerCode = code.toLowerCase();
  return VISUAL_LIBRARIES.some(lib => 
    lowerCode.includes(`import ${lib}`) || 
    lowerCode.includes(`from ${lib}`) ||
    lowerCode.includes(`${lib}.`) ||
    lowerCode.includes(`as ${lib}`)
  );
}

// Extract what the code is trying to visualize
function extractVisualizationDescription(code: string): string {
  const lines = code.split('\n');
  let description = '';
  
  // Look for comments that describe the visualization
  for (const line of lines) {
    if (line.trim().startsWith('#')) {
      description += line.replace('#', '').trim() + ' ';
    }
  }
  
  // Analyze the code structure
  const codeAnalysis: string[] = [];
  
  // Detect chart types
  if (code.includes('plt.plot') || code.includes('.plot(')) codeAnalysis.push('line chart/graph');
  if (code.includes('plt.bar') || code.includes('.bar(')) codeAnalysis.push('bar chart');
  if (code.includes('plt.scatter') || code.includes('.scatter(')) codeAnalysis.push('scatter plot');
  if (code.includes('plt.pie') || code.includes('.pie(')) codeAnalysis.push('pie chart');
  if (code.includes('plt.hist') || code.includes('.hist(')) codeAnalysis.push('histogram');
  if (code.includes('plt.boxplot') || code.includes('.boxplot(')) codeAnalysis.push('box plot');
  if (code.includes('plt.heatmap') || code.includes('sns.heatmap')) codeAnalysis.push('heatmap');
  if (code.includes('plt.contour') || code.includes('.contour(')) codeAnalysis.push('contour plot');
  if (code.includes('plt.imshow') || code.includes('.imshow(')) codeAnalysis.push('image display');
  if (code.includes('plt.subplot') || code.includes('subplots')) codeAnalysis.push('multiple subplots');
  if (code.includes('3d') || code.includes('Axes3D') || code.includes('projection=\'3d\'')) codeAnalysis.push('3D visualization');
  
  // Detect turtle graphics
  if (code.includes('turtle')) {
    if (code.includes('circle')) codeAnalysis.push('circles');
    if (code.includes('forward') || code.includes('fd(')) codeAnalysis.push('lines/paths');
    if (code.includes('square') || code.includes('90')) codeAnalysis.push('squares/rectangles');
    if (code.includes('star')) codeAnalysis.push('star shape');
    if (code.includes('spiral')) codeAnalysis.push('spiral pattern');
    if (code.includes('fractal') || code.includes('recursive')) codeAnalysis.push('fractal pattern');
    if (code.includes('flower') || code.includes('petal')) codeAnalysis.push('flower pattern');
    if (code.includes('tree')) codeAnalysis.push('tree structure');
    if (code.includes('color') || code.includes('fillcolor')) codeAnalysis.push('with colors');
  }
  
  // Look for specific data or functions being plotted
  const mathFunctions = [];
  if (code.includes('sin')) mathFunctions.push('sine');
  if (code.includes('cos')) mathFunctions.push('cosine');
  if (code.includes('tan')) mathFunctions.push('tangent');
  if (code.includes('exp(') || code.includes('e**')) mathFunctions.push('exponential');
  if (code.includes('log')) mathFunctions.push('logarithmic');
  if (code.includes('sqrt')) mathFunctions.push('square root');
  if (code.includes('x**2') || code.includes('x*x')) mathFunctions.push('quadratic');
  if (code.includes('x**3')) mathFunctions.push('cubic');
  
  if (mathFunctions.length > 0) {
    codeAnalysis.push(`${mathFunctions.join(' and ')} function(s)`);
  }
  
  // Extract title if present
  const titleMatch = code.match(/(?:plt\.title|ax\.set_title|title=)[^'"]*['"]([^'"]+)['"]/);
  if (titleMatch) {
    codeAnalysis.push(`titled "${titleMatch[1]}"`);
  }
  
  // Extract labels
  const xlabelMatch = code.match(/(?:plt\.xlabel|ax\.set_xlabel)[^'"]*['"]([^'"]+)['"]/);
  const ylabelMatch = code.match(/(?:plt\.ylabel|ax\.set_ylabel)[^'"]*['"]([^'"]+)['"]/);
  if (xlabelMatch) codeAnalysis.push(`x-axis: ${xlabelMatch[1]}`);
  if (ylabelMatch) codeAnalysis.push(`y-axis: ${ylabelMatch[1]}`);
  
  // Detect color schemes
  if (code.includes('cmap=') || code.includes('colormap')) codeAnalysis.push('with colormap');
  if (code.includes('color=') || code.includes('c=')) codeAnalysis.push('with custom colors');
  
  // Detect grid
  if (code.includes('grid(')) codeAnalysis.push('with grid lines');
  
  // Detect legend
  if (code.includes('legend(')) codeAnalysis.push('with legend');
  
  // Build the full description
  let fullDescription = description.trim();
  if (codeAnalysis.length > 0) {
    if (fullDescription) fullDescription += '. ';
    fullDescription += 'Visualization showing: ' + codeAnalysis.join(', ');
  }
  
  return fullDescription || 'A Python visualization based on the provided code';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing visual Python code:', code.substring(0, 200));

    // Check if this is visualization code
    if (!containsVisualization(code)) {
      return new Response(
        JSON.stringify({ 
          error: 'No visualization library detected',
          isVisual: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Extract description from the code
    const visualDescription = extractVisualizationDescription(code);
    console.log('Extracted visualization description:', visualDescription);

    // Create a detailed prompt for image generation
    const imagePrompt = `Generate a high-quality, professional visualization that would be produced by this Python code:

${code}

The visualization should be: ${visualDescription}

Requirements:
- Create an accurate representation of what this Python code would output
- Use clean, professional styling similar to matplotlib/seaborn default themes
- Include any axes, labels, titles, legends as specified in the code
- Use appropriate colors and styling
- The output should look like an actual Python-generated plot/visualization
- High resolution, clear text and lines
- White or light background typical of data visualization libraries`;

    console.log('Calling AI image generation...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI image generation error:', response.status, errorText);
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI image response received');

    // Extract the image URL from the response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content || '';

    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    return new Response(
      JSON.stringify({
        isVisual: true,
        imageUrl: imageUrl,
        description: visualDescription,
        message: textResponse
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in visual Python execution:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate visualization' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
