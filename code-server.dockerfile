FROM lscr.io/linuxserver/code-server:latest
RUN apt-get update
RUN apt-get install unzip
RUN cd /tmp && curl -Lo "deno.zip" "https://github.com/denoland/deno/releases/download/v1.39.1/deno-x86_64-unknown-linux-gnu.zip"
RUN unzip -d /usr/local/bin /tmp/deno.zip