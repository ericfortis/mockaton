start:
	./packaton.js development 

build: sync_images avif
	./packaton.js production

preview: build
	open http://localhost:8989
	docker run --rm \
		--publish 8989:80 \
		--volume $(PWD)/nginx-preview.conf:/etc/nginx/nginx.conf:ro \
		--volume $(PWD)/dist:/dist/:ro \
		nginx:alpine

zip: build
	open https://dash.cloudflare.com/217e3cb321d535a2b5a4cddb3b4439fc/pages/view/mockaton/deployments/new
	rm -f dist.zip
	cd dist && zip -qrX ../dist.zip .


sync_images:
	cp ../pixaton-tests/tests/macos/pic-for-readme* src/assets/media/

avif:
	npx mediasnacks avif -y src/assets/media/**/*.png

moov2front:
	npx mediasnacks moov2front src/assets/media/**/*.mp4

resize-video:
	npx mediasnacks resize --overwrite --width 1920 src/assets/media/**/*.mp4


.PHONY: *
