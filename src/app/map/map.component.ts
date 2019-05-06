import { Component, OnInit, ElementRef } from '@angular/core';

import * as _ from 'lodash';
import * as L from 'leaflet';
import turf from 'turf';
import 'leaflet-mouse-position';
import 'src/assets/js/leaflet-measure.pt_BR';
import { ClickHandler } from 'src/app/map/handler/click-handler';
import { Subscription } from 'rxjs/internal/Subscription';

declare var UIkit: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  map: L.Map;
  clickHandler: ClickHandler;

  longitude = -48.527420;
  latitude = -27.597436;

  options = {
    layers: [
      L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '...' })
    ],
    zoom: 14,
    center: L.latLng(-27.597436, -48.527420)
  };

  measureControl: any;
  mouseTooltip: string;
  polygonsList: any[] = [{}];
  measuring = false;

  private mapClickSubscription: Subscription;

  constructor() { }

  ngOnInit() {
    this.map = L.map(document.getElementById('map'), this.options);

    if (!this.clickHandler) {
      this.clickHandler = new ClickHandler(this.map);
    }
    this.clickHandler.enable();

    this.map.on('measurestart', () => {
      this.mouseTooltip = 'Clique no mapa para iniciar';
      this.measuring = true;
      this.startTooltip();
    });

    this.map.on('measurefinish', (event: any) => {
      this.polygonsList.push(event);
      this.stopTooltip();
      this.measuring = false;
      const bounds = new L.LatLngBounds(event.points);
      const coordinates = event.points.map(point => [point.lat, point.lng]);

      const marker = L.marker(bounds.getCenter(), {
        icon: L.divIcon({
            className: 'leaflet-mouse-marker',
            iconAnchor: [20, 20],
            iconSize: [40, 40]
        }),
        opacity: 0
      });

      this.map.eachLayer((layer: any) => {
        if (layer.feature) {
          if (this.isMarkerInsidePolygon([bounds.getCenter().lat, bounds.getCenter().lng], layer)) {
            this.measureControl.options.polygonName = 'Polígono ' + this.polygonsList.length;
            this.measureControl.options.properties = layer.feature.properties;
            this.measureControl.options.keys = Object.keys(layer.feature.properties);
            const customPopup = `<h3>${this.measureControl.options.polygonName }</h3>
            <ul class="uk-list polygon-list uk-list-striped uk-margin-remove-top uk-margin-remove-bottom">
              <li>
                <div class="uk-child-width-1-2" uk-grid>
                  <div>Área</div>
                  <div class="uk-padding-remove-left color-data">${this.measureControl.options.lengthDisplay} Perímetro</div>
                </div>
              </li>
            </ul>
            <ul class="tasks uk-margin-remove-top">
              <li><a href=# class="js-zoomto zoomto">Centralizar nesta área</a></li>
              <li><a href=# class="js-deletemarkup deletemarkup">Excluir</a></li>
            </ul>`;
           
            const customOptions = {
              maxWidth: 500,
              className : 'custom'
            }

            marker.bindPopup(customPopup, customOptions).addTo(this.map);
            marker.openPopup();
          }
        }
      });
    });

    this.map.on('measureclick', (event: any) => {
      if (event.count > 0 && event.count < 3) {
        this.mouseTooltip = 'Desenhe o polígono';
      } else if (event.count >= 3) {
        this.mouseTooltip = 'Clique duas vezes para finalizar ou continue';
      }
    });

    this.mapClickSubscription = this.clickHandler.mapClick$.subscribe((event: any) => {
      // this.map.eachLayer((layer: any) => {
      //   if (layer.feature) {
      //     if (this.isMarkerInsidePolygon([event.latlng.lat, event.latlng.lng], layer)) {
      //       console.log(layer)
      //     }
      //   }
      // });
    });

    this.startLayer();

    this.initControls();
  }

  startMeasure() {
    this.measureControl._startMeasure();
  }

  startTooltip() {
    document.getElementById('map').onmousemove = (event) => {
      document.getElementById('tooltip').setAttribute('style', `display: inline-block; left: ${event.pageX + 10}px; top: ${event.pageY}px`);
    }
  }

  stopTooltip() {
    document.getElementById('map').onmousemove = (event) => {
      document.getElementById('tooltip').setAttribute('style', `display: none`);
      event.stopPropagation();
    }
  }

  initControls() {
    this.map.zoomControl.setPosition('bottomright');
    L.control.mousePosition().addTo(this.map);
    L.control.scale({ position: 'bottomleft' }).addTo(this.map);

    this.measureControl = L.control.measure({
      position: 'topright',
      primaryLengthUnit: 'meters',
      secondaryLengthUnit: 'hectares',
      activeColor: '#00B9F0',
      completedColor: '#002F66'
    });

    this.measureControl.addTo(this.map);
  }

  startLayer() {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '../../assets/tcc-shapefile.geojson');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = 'json';
    xhr.onload = () => {
      if (xhr.status !== 200) return
      const data = _.cloneDeep(xhr.response);
      L.geoJSON(data).addTo(this.map);
    };
    xhr.send();
  }

  isMarkerInsidePolygon([lat, lng], poly) {
    if (!poly.getLatLngs()) return;
    let inside = false;
    let x = lat, y = lng;
    for (let ii=0; ii < poly.getLatLngs().length; ii++){
        for (let yy=0; yy < poly.getLatLngs()[ii].length; yy++) {
          let polyPoints = poly.getLatLngs()[ii][yy];
          for (let i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
            let xi = polyPoints[i].lat, yi = polyPoints[i].lng;
            let xj = polyPoints[j].lat, yj = polyPoints[j].lng;

            let intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
        }
    }

    return inside;    
  };

}
