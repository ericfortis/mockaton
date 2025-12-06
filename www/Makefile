dev:
	./packaton.js development 

build: 
	./packaton.js production

preview: build
	open http://localhost
	nginx -p '' -c nginx-simulate-prod.conf

zip: build
	open https://dash.cloudflare.com/217e3cb321d535a2b5a4cddb3b4439fc/pages/view/mockaton/deployments/new
	cd dist && zip -r -X ../dist.zip .


avif:
	npx mediasnacks avif -y 'src/static/media/**/*.png'

moov2front:
	npx mediasnacks moov2front 'src/static/media/**/*.mp4'

resize-video:
	npx mediasnacks resize --overwrite --width 1920 'src/static/media/**/*.mp4'


.PHONY: *
