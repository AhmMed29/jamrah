// Collection of shader programs for the app

// Shader 1: Original flowing waves shader
export const flowingWavesShader = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform bool hasActiveReminders;
uniform bool hasUpcomingReminders;
uniform bool disableCenterDimming;
varying vec2 vTextureCoord;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

  // Calculate distance from center for dimming the center
  vec2 center = iResolution.xy * 0.5;
  float dist = distance(fragCoord, center);
  float radius = min(iResolution.x, iResolution.y) * 0.5;
  
  // Create a dimming factor for the center area (30% of the radius)
  float centerDim = disableCenterDimming ? 1.0 : smoothstep(radius * 0.3, radius * 0.5, dist);

  for(float i = 1.0; i < 10.0; i++){
    uv.x += 0.6 / i * cos(i * 2.5 * uv.y + iTime);
    uv.y += 0.6 / i * cos(i * 1.5 * uv.x + iTime);
  }
  
  // Determine color based on reminder state
  if (hasActiveReminders) {
    // Blue shade for active reminders
    fragColor = vec4(vec3(0.1, 0.3, 0.6) / abs(sin(iTime - uv.y - uv.x)), 1.0);
  } else if (hasUpcomingReminders) {
    // Green shade for upcoming reminders
    fragColor = vec4(vec3(0.1, 0.5, 0.2) / abs(sin(iTime - uv.y - uv.x)), 1.0);
  } else {
    // Original neutral color
    fragColor = vec4(vec3(0.1) / abs(sin(iTime - uv.y - uv.x)), 1.0);
  }
  
  // Apply center dimming only if not disabled
  if (!disableCenterDimming) {
    fragColor.rgb = mix(fragColor.rgb * 0.3, fragColor.rgb, centerDim);
  }
}

void main() {
  vec2 fragCoord = vTextureCoord * iResolution;
  
  // Calculate distance from center for circular mask
  vec2 center = iResolution * 0.5;
  float dist = distance(fragCoord, center);
  float radius = min(iResolution.x, iResolution.y) * 0.5;
  
  // Only render inside circle
  if (dist < radius) {
    vec4 color;
    mainImage(color, fragCoord);
    gl_FragColor = color;
  } else {
    discard;
  }
}
`;

// Shader 2: Ether by nimitz - replacing Spectral Flow
export const etherShader = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform bool hasActiveReminders;
uniform bool hasUpcomingReminders;
uniform bool disableCenterDimming;
varying vec2 vTextureCoord;

// Ether by nimitz 2014 (twitter: @stormoid)
// https://www.shadertoy.com/view/MsjSW3
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License

#define t iTime
mat2 m(float a){float c=cos(a), s=sin(a);return mat2(c,-s,s,c);}
float map(vec3 p, bool isActive, bool isUpcoming){
    p.xz*= m(t*0.4);p.xy*= m(t*0.3);
    vec3 q = p*2.+t;
    return length(p+vec3(sin(t*0.7)))*log(length(p)+1.) + sin(q.x+sin(q.z+sin(q.y)))*0.5 - 1.;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Calculate aspect-corrected UV coordinates
    vec2 p = fragCoord.xy/min(iResolution.x, iResolution.y) - vec2(.9, .5);
    // Shift center for our circular viewport
    p.x += 0.4;
    
    vec3 cl = vec3(0.);
    float d = 2.5;
    
    // Ray marching loop
    for(int i=0; i<=5; i++) {
        vec3 p3d = vec3(0,0,5.) + normalize(vec3(p, -1.))*d;
        float rz = map(p3d, hasActiveReminders, hasUpcomingReminders);
        float f = clamp((rz - map(p3d+.1, hasActiveReminders, hasUpcomingReminders))*0.5, -.1, 1.);
        
        // Adjust colors based on reminder states
        vec3 baseColor;
        if(hasActiveReminders) {
            // Blue palette for active reminders
            baseColor = vec3(0.05, 0.2, 0.5) + vec3(4.0, 2.0, 5.0)*f;
        } else if(hasUpcomingReminders) {
            // Green palette for upcoming reminders
            baseColor = vec3(0.05, 0.3, 0.1) + vec3(2.0, 5.0, 1.0)*f;
        } else {
            // Original purple-blue palette
            baseColor = vec3(0.1, 0.3, 0.4) + vec3(5.0, 2.5, 3.0)*f;
        }
        
        cl = cl*baseColor + smoothstep(2.5, .0, rz)*.7*baseColor;
        d += min(rz, 1.);
    }
    
    // Add subtle mouse interaction
    float mouseInfluence = 0.0;
    if(iMouse.x > 0.0 || iMouse.y > 0.0) {
        vec2 mousePos = iMouse.xy;
        float mouseDist = length(p - (mousePos*2.0-vec2(1.0))*0.5);
        mouseInfluence = smoothstep(0.6, 0.0, mouseDist);
        
        // Add subtle glow around mouse
        if(hasActiveReminders) {
            cl += vec3(0.2, 0.4, 1.0) * mouseInfluence * 0.3;
        } else if(hasUpcomingReminders) {
            cl += vec3(0.2, 1.0, 0.4) * mouseInfluence * 0.3;
        } else {
            cl += vec3(0.5, 0.3, 0.7) * mouseInfluence * 0.3;
        }
    }
    
    // Calculate distance from center for dimming the center
    vec2 center = iResolution.xy * 0.5;
    float dist = distance(fragCoord, center);
    float radius = min(iResolution.x, iResolution.y) * 0.5;
    
    // Create a dimming factor for the center area (30% of the radius)
    float centerDim = disableCenterDimming ? 1.0 : smoothstep(radius * 0.3, radius * 0.5, dist);
    
    fragColor = vec4(cl, 1.0);
    
    // Apply center dimming only if not disabled
    if (!disableCenterDimming) {
        fragColor.rgb = mix(fragColor.rgb * 0.3, fragColor.rgb, centerDim);
    }
}

void main() {
    vec2 fragCoord = vTextureCoord * iResolution;
    
    // Calculate distance from center for circular mask
    vec2 center = iResolution * 0.5;
    float dist = distance(fragCoord, center);
    float radius = min(iResolution.x, iResolution.y) * 0.5;
    
    // Only render inside circle
    if (dist < radius) {
        vec4 color;
        mainImage(color, fragCoord);
        gl_FragColor = color;
    } else {
        discard;
    }
}
`;

// Shader 3: Shooting Stars
export const shootingStarsShader = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform bool hasActiveReminders;
uniform bool hasUpcomingReminders;
uniform bool disableCenterDimming;
varying vec2 vTextureCoord;

void mainImage(out vec4 O, in vec2 fragCoord) {
  O = vec4(0.0, 0.0, 0.0, 1.0);
  vec2 b = vec2(0.0, 0.2);
  vec2 p;
  mat2 R = mat2(1.0, 0.0, 0.0, 1.0); // Initial identity matrix
  
  // Calculate distance from center for dimming the center
  vec2 center = iResolution.xy * 0.5;
  float dist = distance(fragCoord, center);
  float radius = min(iResolution.x, iResolution.y) * 0.5;
  
  // Create a dimming factor for the center area (30% of the radius)
  float centerDim = disableCenterDimming ? 1.0 : smoothstep(radius * 0.3, radius * 0.5, dist);
  
  // Using a proper GLSL loop structure
  for(int i = 0; i < 20; i++) {
    float fi = float(i) + 1.0; // Starting from 1.0
    
    // Create rotation matrix for this iteration
    float angle = fi + 0.0;
    float c = cos(angle);
    float s = sin(angle);
    R = mat2(c, -s, s, c);
    
    // Second rotation for effect
    float angle2 = fi + 33.0;
    float c2 = cos(angle2);
    float s2 = sin(angle2);
    mat2 R2 = mat2(c2, -s2, s2, c2);
    
    // Calculate position
    vec2 coord = fragCoord / iResolution.y * fi * 0.1 + iTime * b;
    vec2 frac_coord = fract(coord * R2) - 0.5;
    p = R * frac_coord;
    vec2 clamped_p = clamp(p, -b, b);
    
    // Calculate intensity and color
    float len = length(clamped_p - p);
    if (len > 0.0) {
      vec4 star = 1e-3 / len * (cos(p.y / 0.1 + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0);
      O += star;
    }
  }
  
  // Adjust colors based on reminder state
  if (hasActiveReminders) {
    // Blue for active reminders
    O.rgb = mix(O.rgb, vec3(0.2, 0.4, 1.0), 0.3);
  } else if (hasUpcomingReminders) {
    // Green for upcoming reminders
    O.rgb = mix(O.rgb, vec3(0.2, 1.0, 0.4), 0.3);
  }
  
  // Apply center dimming only if not disabled
  if (!disableCenterDimming) {
    O.rgb = mix(O.rgb * 0.3, O.rgb, centerDim);
  }
}

void main() {
  vec2 fragCoord = vTextureCoord * iResolution;
  
  // Calculate distance from center for circular mask
  vec2 center = iResolution * 0.5;
  float dist = distance(fragCoord, center);
  float radius = min(iResolution.x, iResolution.y) * 0.5;
  
  // Only render inside circle
  if (dist < radius) {
    vec4 color;
    mainImage(color, fragCoord);
    gl_FragColor = color;
  } else {
    discard;
  }
}
`;

// Shader 4: Wavy Lines shader
export const wavyLinesShader = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform bool hasActiveReminders;
uniform bool hasUpcomingReminders;
uniform bool disableCenterDimming;
varying vec2 vTextureCoord;

#define PI 3.14159265359

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i.x + i.y * 57.0);
    float b = hash(i.x + 1.0 + i.y * 57.0);
    float c = hash(i.x + i.y * 57.0 + 1.0);
    float d = hash(i.x + 1.0 + i.y * 57.0 + 1.0);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for(int i = 0; i < 6; i++) {
        sum += amp * noise(p * freq);
        amp *= 0.5;
        freq *= 2.0;
    }
    return sum;
}

float lines(vec2 uv, float thickness, float distortion) {
    // Create wavy lines
    float y = uv.y;
    
    // Apply distortion based on fbm noise
    float distortionAmount = distortion * fbm(vec2(uv.x * 2.0, y * 0.5 + iTime * 0.1));
    y += distortionAmount;
    
    // Create lines with smooth step
    float linePattern = fract(y * 20.0);
    float line = smoothstep(0.5 - thickness, 0.5, linePattern) - 
                smoothstep(0.5, 0.5 + thickness, linePattern);
    
    return line;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Correct aspect ratio
    vec2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    // Mouse interaction
    vec2 mousePos = iMouse.xy;
    mousePos.x *= aspect;
    float mouseDist = length(uv - mousePos);
    float mouseInfluence = smoothstep(0.5, 0.0, mouseDist);
    
    // Base thickness and distortion
    float baseThickness = 0.05;
    float baseDistortion = 0.2;
    
    // Adjust thickness and distortion based on mouse
    float thickness = mix(baseThickness, baseThickness * 1.5, mouseInfluence);
    float distortion = mix(baseDistortion, baseDistortion * 2.0, mouseInfluence);
    
    // Generate the wavy lines
    float line = lines(uv, thickness, distortion);
    
    // Add subtle movement over time
    float timeOffset = sin(iTime * 0.2) * 0.1;
    float animatedLine = lines(uv + vec2(timeOffset, 0.0), thickness, distortion);
    
    // Blend between static and animated lines
    line = mix(line, animatedLine, 0.3);
    
    // Default line colors based on reminder states
    vec3 backgroundColor = vec3(0.0, 0.0, 0.0);
    vec3 lineColor;
    
    if (hasActiveReminders) {
        // Blue for active reminders
        lineColor = vec3(0.2, 0.4, 1.0);
    } else if (hasUpcomingReminders) {
        // Green for upcoming reminders
        lineColor = vec3(0.2, 1.0, 0.4);
    } else {
        // White for default
        lineColor = vec3(1.0, 1.0, 1.0);
    }
    
    vec3 finalColor = mix(backgroundColor, lineColor, line);
    
    // Add subtle glow around mouse position
    if (hasActiveReminders) {
        finalColor += vec3(0.1, 0.2, 0.5) * mouseInfluence * line;
    } else if (hasUpcomingReminders) {
        finalColor += vec3(0.1, 0.5, 0.2) * mouseInfluence * line;
    } else {
        finalColor += vec3(0.1, 0.1, 0.1) * mouseInfluence * line;
    }
    
    fragColor = vec4(finalColor, 1.0);
    
    // Calculate distance from center for dimming the center
    vec2 center = iResolution.xy * 0.5;
    float dist = distance(fragCoord, center);
    float radius = min(iResolution.x, iResolution.y) * 0.5;
    
    // Create a dimming factor for the center area (30% of the radius)
    float centerDim = disableCenterDimming ? 1.0 : smoothstep(radius * 0.3, radius * 0.5, dist);
    
    // Apply center dimming only if not disabled
    if (!disableCenterDimming) {
        fragColor.rgb = mix(fragColor.rgb * 0.3, fragColor.rgb, centerDim);
    }
}

void main() {
    vec2 fragCoord = vTextureCoord * iResolution;
    
    // Calculate distance from center for circular mask
    vec2 center = iResolution * 0.5;
    float dist = distance(fragCoord, center);
    float radius = min(iResolution.x, iResolution.y) * 0.5;
    
    // Only render inside circle
    if (dist < radius) {
        vec4 color;
        mainImage(color, fragCoord);
        gl_FragColor = color;
    } else {
        discard;
    }
}
`;

// Common vertex shader for all shaders
export const vertexShader = `
attribute vec4 aVertexPosition;
attribute vec2 aTextureCoord;
varying vec2 vTextureCoord;
void main() {
  gl_Position = aVertexPosition;
  vTextureCoord = aTextureCoord;
}
`;

// Shader collection for easy access
export const shaders = [
  {
    id: 1,
    name: "Flowing Waves",
    fragmentShader: flowingWavesShader,
    color: "#6366f1" // Indigo color
  },
  {
    id: 2,
    name: "Ether",
    fragmentShader: etherShader,
    color: "#8b5cf6" // Purple color
  },
  {
    id: 3,
    name: "Shooting Stars",
    fragmentShader: shootingStarsShader,
    color: "#ec4899" // Pink color
  },
  {
    id: 4,
    name: "Wavy Lines",
    fragmentShader: wavyLinesShader,
    color: "#10b981" // Emerald color
  }
];