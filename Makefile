%.wasm: %.c
	emcc $< -o $@ -sSIDE_MODULE=1 -O3
