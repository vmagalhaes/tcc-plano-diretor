import { Component, OnInit, ElementRef } from '@angular/core';

import * as _ from 'lodash';
import * as L from 'leaflet';
import turf from 'turf';
import 'leaflet-mouse-position';
import 'src/assets/js/leaflet-measure.pt_BR';
import { ClickHandler } from 'src/app/map/handler/click-handler';
import { UlandService } from '../services/uland.service';

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
  polygonsCount: number = 0;
  measuring = false;
  marker: any;
  markerGroup = new L.LayerGroup();
  captureClick: any;

  constructor(
    private ulandService: UlandService
  ) { }

  ngOnInit() {
    this.map = L.map(document.getElementById('map'), this.options);

    this.ulandService
      .getSources()
      .subscribe((sources) => {
        console.log(sources);
      }, (error) => {
        console.log(error);
      });

    if (!this.clickHandler) {
      this.clickHandler = new ClickHandler(this.map);
    }
    this.clickHandler.enable();

    this.map.on('measurestart', (event) => {
      this.captureClick = event;
      this.mouseTooltip = 'Clique no mapa para iniciar';
      this.measuring = true;
      this.startTooltip();
    });

    this.map.on('measurefinish', (event: any) => {
      this.polygonsCount++;
      this.stopTooltip();
      this.measuring = false;
      const bounds = new L.LatLngBounds(event.points);
      const northWest = bounds.getNorthWest(),
        northEast = bounds.getNorthEast(),
        distance = northWest.distanceTo(northEast),
        distanceFromCenter = distance / 2;

      const marker = <any>(L.marker(bounds.getCenter(), {
        icon: L.divIcon({
            className: 'leaflet-mouse-marker',
            iconAnchor: [20, 20],
            iconSize: [50, 50]
        }),
        opacity: 0
      }));

      this.map.eachLayer((layer: any) => {
        if (layer.feature) {
          if (this.isMarkerInsidePolygon([bounds.getCenter().lat, bounds.getCenter().lng], layer)) {
            const customPopup =
           `<h3>${'Polígono ' + this.polygonsCount}</h3>
            <ul class="uk-list polygon-list uk-list-striped uk-margin-remove-top uk-margin-remove-bottom">
              <li>
                <div class="uk-child-width-1-2" uk-grid>
                  <div>Área</div>
                  <div class="uk-padding-remove-left color-data">${event.lengthDisplay} Perímetro</div>
                </div>
              </li>
              ` +
              _.map(Object.keys(layer.feature.properties), (key) => {
                return `
                <li>
                  <div class="uk-child-width-1-2" uk-grid>
                    <div>${key}</div>
                    <div class="uk-padding-remove-left color-data">${layer.feature.properties[key]}</div>
                  </div>
                </li>`;
              }).join('') +
           `</ul>
            <ul class="tasks uk-margin-remove-top">
              <li><a id="zoomto-${this.polygonsCount}" class="js-zoom zoomto">Centralizar nesta área</a></li>
              <li><a id="delete-${this.polygonsCount}" class="js-deletemarkup deletemarkup">Excluir</a></li>
            </ul>
            <hr class="uk-margin-small-top uk-margin-small-bottom">
            <ul class="uk-margin-remove-top uk-padding-remove-left external-links">
              <li><a target="_blank" href="http://www.pmf.sc.gov.br/arquivos/arquivos/pdf/18_07_2014_10.03.37.82e294196c4df9b7c1459599611bd6ee.pdf" class="link">Tabela de adequação de uso</a></li>
              <li><a target="_blank" href="http://www.pmf.sc.gov.br/arquivos/arquivos/pdf/18_07_2014_10.02.53.9bc76f3acfe3be22bc5373423ae3f59b.pdf" class="link">Tabela de limites de ocupação</a></li>
              <li><a target="_blank" href="https://leismunicipais.com.br/plano-diretor-florianopolis-sc" class="link">Plano diretor</a></li>
            </lu>
            `;

            const customOptions = {
              maxWidth: 800,
              className : 'custom-popup',
              polygonsCount: this.polygonsCount,
              bounds
            }

            marker
              .bindPopup(customPopup, customOptions)
              .on('popupopen', (popupContainer) => {
                this.deleteLayer(popupContainer.popup.options.polygonsCount);
                this.zoomTo(popupContainer.popup.options.polygonsCount);
              })
              .addTo(this.map);
          }
        }
      });

      setTimeout(() => {
        marker.openPopup();

        this.map.eachLayer((layer: any) => {
          if (layer._path) {
            if (layer._path.classList[0] === 'layer-measure-resultarea') {
              layer._path.onclick = () => {
                marker.openPopup()
              };
              marker.layer = layer;
              this.markerGroup.addLayer(marker);
            }
          }
        });
      });
    });

    this.map.on('measureclick', (event: any) => {
      if (event.count > 0 && event.count < 3) {
        this.mouseTooltip = 'Desenhe o polígono';
      } else if (event.count >= 3) {
        this.mouseTooltip = 'Clique duas vezes para finalizar ou continue';
      }
    });

    this.startLayer();
    this.initControls();
  }

  zoomTo(id: number) {
    document.getElementById('zoomto-' + id).onclick = () => {
      _.forEach(this.markerGroup.getLayers(), (marker) => {
        if (marker.isPopupOpen) {
          this.map.fitBounds(new L.FeatureGroup([marker]).getBounds(), { padding: [20, 20], maxZoom: 17 });
        }
      });
    };
  }

  deleteLayer(id: number) {
    document.getElementById('delete-' + id).onclick = () => {
      _.forEach(this.markerGroup.getLayers(), (marker) => {
        if (marker.isPopupOpen()) {
          this.map.removeLayer(marker.layer);
          this.map.removeLayer(marker);
          this.markerGroup.removeLayer(marker);
          this.polygonsCount--;
        }
      });
    };
  }

  startMeasure() {
    this.measureControl._startMeasure();
  }

  stopMeasure() {
    this.captureClick.fireEvent('dblclick', null, this)
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

    L.Control.Legends = L.Control.extend({
      onAdd: (map) => {
        const div = L.DomUtil.create('div', 'info legend');
        let labels = ['<div class="uk-margin-small-bottom"><strong>Zoneamento</strong></div>'],
        categories = [
          'ACI',
          'AMC',
          'APL-E',
          'APP',
          'ARM',
          'ARP',
          'ATL',
          'AVL',
          'ZEI'
        ];

        for (let i = 0; i < categories.length; i++) {
          div.innerHTML +=
            labels.push(
              '<div class="uk-margin-small-bottom"><i class="circle" style="background:' + this.getColor(categories[i]) + '"></i>' + (categories[i] ? categories[i] + '</div>' : '+'));
        }

        div.innerHTML = labels.join('');
        return div;
      }
    });

    L.control.legends = (options) => {
      return new L.Control.Legends(options);
    }

    L.control.legends({ position: 'topright' }).addTo(this.map);
  }

  startLayer() {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '../../assets/tcc-shapefile.geojson');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = 'json';
    xhr.onload = () => {
      if (xhr.status !== 200) return
      const data = _.cloneDeep(xhr.response);
      L.geoJSON(data, {
        style: (feature) => {
          return {
              weight: 1,
              opacity: 1,
              color: 'white',
              fillOpacity: 0.7,
              fillColor: this.getColor(feature.properties.nm_zon)
          };
        }
      }).addTo(this.map);
    };
    xhr.send();
  }

  getColor(name: any) {
    return name === 'ACI' ? '#FC4E2A' :
           name === 'AMC' ? '#ca63b2' :
           name === 'APL-E' ? '#7ba3e8' :
           name === 'APP' ? '#1aec67' :
           name === 'ARM' ? '#df3f59' :
           name === 'ARP' ? '#FED976' :
           name === 'ATL' ? '#a467c8' :
           name === 'AVL' ? '#168de7' :
           name === 'ZEI' ? '#d4d76c' :
           '#000000';
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
