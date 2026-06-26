import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { shaders, vertexShader } from "./util/shaders";

interface ShaderPreviewButtonProps {
  shaderId: number;
  isSelected: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const ShaderPreviewButton = ({ 
  shaderId, 
  isSelected, 
  onSelect, 
  onMouseEnter, 
  onMouseLeave 
}: ShaderPreviewButtonProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mousePositionRef = useRef<[number, number]>([0.5, 0.5]); // Center for preview
  const programInfoRef = useRef<any>(null);
  
  // Get shader details
  const shader = shaders.find(s => s.id === shaderId) || shaders[0];

  // Setup and run WebGL for the preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true });
    if (!gl) {
      console.error("WebGL not supported for preview");
      return;
    }

    // Fixed size for preview
    canvas.width = 40;
    canvas.height = 40;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Use the vertex shader and selected fragment shader
    const vsSource = vertexShader;
    const fsSource = shader.fragmentShader;

    // Initialize shader program
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (!shaderProgram) return;

    programInfoRef.current = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
      },
      uniformLocations: {
        iResolution: gl.getUniformLocation(shaderProgram, 'iResolution'),
        iTime: gl.getUniformLocation(shaderProgram, 'iTime'),
        iMouse: gl.getUniformLocation(shaderProgram, 'iMouse'),
        hasActiveReminders: gl.getUniformLocation(shaderProgram, 'hasActiveReminders'),
        hasUpcomingReminders: gl.getUniformLocation(shaderProgram, 'hasUpcomingReminders'),
        disableCenterDimming: gl.getUniformLocation(shaderProgram, 'disableCenterDimming'),
      },
    };

    // Create buffers
    const buffers = initBuffers(gl);
    let startTime = Date.now();

    // Render function
    const render = () => {
      const currentTime = (Date.now() - startTime) / 1000;
      drawScene(gl!, programInfoRef.current, buffers, currentTime, canvas.width, canvas.height);
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationRef.current);
      // Clean up WebGL resources
      if (gl && shaderProgram) {
        gl.deleteProgram(shaderProgram);
      }
    };
  }, [shader]); // Depend only on the shader changing, not mouse position

  // Initialize shader program
  function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) return null;

    // Create the shader program
    const shaderProgram = gl.createProgram();
    if (!shaderProgram) return null;

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // Check if it linked successfully
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
    }

    return shaderProgram;
  }

  // Load shader
  function loadShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // Check if compilation succeeded
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  // Initialize buffers
  function initBuffers(gl: WebGLRenderingContext) {
    // Create a buffer for positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1.0, -1.0,
       1.0, -1.0,
       1.0,  1.0,
      -1.0,  1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Create a buffer for texture coordinates
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    const textureCoordinates = [
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

    // Create a buffer for indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    const indices = [
      0, 1, 2,
      0, 2, 3,
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
      position: positionBuffer,
      textureCoord: textureCoordBuffer,
      indices: indexBuffer,
    };
  }

  // Draw the scene
  function drawScene(
    gl: WebGLRenderingContext, 
    programInfo: any, 
    buffers: any, 
    currentTime: number, 
    width: number, 
    height: number
  ) {
    if (!programInfo) return;
    
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set shader uniforms
    gl.uniform2f(programInfo.uniformLocations.iResolution, width, height);
    gl.uniform1f(programInfo.uniformLocations.iTime, currentTime);
    gl.uniform2f(programInfo.uniformLocations.iMouse, 0.5, 0.5); // Fixed center for preview
    
    // For preview buttons, we always use the default state
    gl.uniform1i(programInfo.uniformLocations.hasActiveReminders, 0);
    gl.uniform1i(programInfo.uniformLocations.hasUpcomingReminders, 0);
    // Disable center dimming for previews to show the full shader effect
    gl.uniform1i(programInfo.uniformLocations.disableCenterDimming, 1);

    // Set vertex position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      2,        // 2 components per vertex
      gl.FLOAT, // the data is 32-bit floats
      false,    // don't normalize
      0,        // stride
      0         // offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // Set texture coordinate attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(
      programInfo.attribLocations.textureCoord,
      2,        // 2 components per vertex
      gl.FLOAT, // the data is 32-bit floats
      false,    // don't normalize
      0,        // stride
      0         // offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    // Draw
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.drawElements(
      gl.TRIANGLES,
      6,                // vertex count
      gl.UNSIGNED_SHORT,// type
      0                 // offset
    );
  }

  return (
    <motion.button
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ 
        scale: isSelected ? 1.1 : 1, 
        opacity: 1,
        boxShadow: isSelected 
          ? '0 0 10px rgba(255, 255, 255, 0.5)' 
          : '0 0 0px transparent' 
      }}
      whileHover={{ scale: 1.15 }}
      transition={{ duration: 0.2 }}
      className="w-10 h-10 rounded-full cursor-pointer border-2 overflow-hidden relative"
      style={{ 
        borderColor: isSelected ? 'white' : 'rgba(255, 255, 255, 0.3)'
      }}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={`Select ${shader.name} shader`}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 rounded-full" 
        style={{ width: '100%', height: '100%' }}
      />
    </motion.button>
  );
};