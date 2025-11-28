dev:
	./packaton.js development 

build: 
	./packaton.js production

preview: build
	open http://localhost
	nginx -p '' -c nginx-simulate-prod.conf


avif:
	npx mediasnacks avif -y 'src/media/**/*.png'

moov2front:
	npx mediasnacks moov2front 'src/media/**/*.mp4'

resize-video:
	npx mediasnacks resize --overwrite --width 1920 'src/media/**/*.mp4'


.PHONY: *
