function fillAreasGl() {
    const gl = this.gl;

    const fsSource = `
    precision mediump float;
    uniform vec3 uResolution;
    void main() {
        // Calculate relative coordinates (uv)
        vec2 uv = ((gl_FragCoord.xy / uResolution.xy) * 4.0) - 2.0;

        float a = 0.0;
        float b = 0.0;
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        for(int i=0;i<100000;i++){
            float na = (a * a) - (b * b) + uv.x;
            b = (2.0 * a * b) + uv.y;
            a = na;
            float ab = a * b;
            if(ab > 4.0 || ab < -4.0){
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            }
        }
    }
    `;

    const shaderProgram = initShaderProgram(gl, fsSource);
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        },
        uniformLocations: {
            resolution: gl.getUniformLocation(shaderProgram, "uResolution"),
        },
    };

    const buffers = initBuffers(gl);

    setPositionAttribute(gl, buffers, programInfo);

    gl.useProgram(shaderProgram);

    gl.uniform3f(programInfo.uniformLocations.resolution, this.width, this.height, 1.0);

    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
}