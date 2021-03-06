import { Component, OnInit, ElementRef } from '@angular/core';

import * as _ from 'lodash';
import * as L from 'leaflet';
import { trigger, state, style, transition, animate } from '@angular/animations';
import 'leaflet-mouse-position';
import 'src/assets/js/leaflet-measure.pt_BR';
import { ClickHandler } from 'src/app/map/handler/click-handler';
import { UlandService } from '../services/uland.service';

declare var UIkit: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  animations: [
    trigger('slideInOut', [
      state('in', style({
        overflow: 'hidden',
        height: '*',
        width: '300px'
      })),
      state('out', style({
        opacity: '0',
        overflow: 'hidden',
        height: '0px',
        width: '0px'
      })),
      transition('in => out', animate('400ms ease-in-out')),
      transition('out => in', animate('400ms ease-in-out'))
    ])
  ]
})
export class MapComponent implements OnInit {
  deletedLayer: any;
  deleteArea: number;

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
  openedLegend = 'out';
  marker: any;
  markerGroup = new L.LayerGroup();
  captureClick: any;
  loading = false;

  constructor(
    private ulandService: UlandService
  ) { }

  ngOnInit() {
    this.map = L.map(document.getElementById('map'), this.options);
    this.loading = true;

    UIkit.util.ready(() => {

      let bar: any = document.getElementById('js-progressbar');

      let animate = setInterval(() => {

          bar.value += 10;

          if (bar.value >= bar.max) {
              clearInterval(animate);
          }

      }, 500);

    this.ulandService
      .getLayers()
      .subscribe((layer: any) => {
        const template = layer.template;
        this.ulandService
          .getFeatures()
          .subscribe((featuresData) => {
            const features = _.map(featuresData, (feat) => {
              const keys = Object.keys(feat);
              let object = {};

              _.forEach((keys), (key) => {
                const te = _.find(template, ['id', parseInt(key)]);
                if (te) {
                  _.assign(object, { [this.getKey(te.key)]: feat[parseInt(key)] });
                }
              });

              return object;
            });

            this.startLayer(features, bar);
          }, (error) => {
            console.warn(error);
          });
      }, (error) => {
        console.warn(error);
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
      if (event.finish) {
        this.polygonsCount++;
        this.stopTooltip();
        let layerFeature: any;
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
            iconSize: [60, 60]
          }),
          opacity: 0
        }));

        this.map.eachLayer((layer: any) => {
          if (layer.feature) {
            if (this.isMarkerInsidePolygon([bounds.getCenter().lat, bounds.getCenter().lng], layer)) {
              event.polygonsCount = this.polygonsCount;
              event.layer = layer;
              layerFeature = layer;
              this.addLayer(event);              
              const customPopup =
             `<h3>${'Área ' + event.polygonsCount}</h3>
              <ul class="uk-list polygon-list uk-list-striped uk-margin-remove-top uk-margin-remove-bottom">
                <li>
                  <div class="uk-child-width-1-2" uk-grid>
                    <div>Área</div>
                    <div class="uk-padding-remove-left color-data">${event.areaDisplay}</div>
                  </div>
                </li>
                ` +
                _.map(Object.keys(layer.feature.properties), (key) => {
                  const value = layer.feature.properties[key].replace(/\n/ig, '');
                  return `
                  <li>
                    <div class="uk-child-width-1-2" uk-grid>
                      <div style="padding-right: 10px">${key}</div>
                      <div class="uk-padding-remove-left color-data">${value ? value : '-'}</div>
                    </div>
                  </li>`;
                }).join('') +
             `</ul>
              <ul class="tasks uk-margin-remove-top">
                <li><a id="zoomto-${this.polygonsCount}" class="js-zoom zoomto">Centralizar nesta área</a></li>
                <li><a id="delete-${this.polygonsCount}" href="#modal-center" uk-toggle class="js-deletemarkup deletemarkup">Excluir</a></li>
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
                  const centerToArea = () => {
                    const bounds = new L.FeatureGroup([marker]).getBounds();
                    this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 });
                    // setTimeout(() => {
                    //   this.map.panTo([this.map.getCenter().lat + 0.005, this.map.getCenter().lng])
                    // }, 100);
                  }
        
                  marker.centerToAreaFunction = centerToArea;
                  this.deleteLayer(popupContainer.popup.options.polygonsCount);
                  this.zoomTo(popupContainer.popup.options.polygonsCount);
                })
                .addTo(this.map);
            }
          }
        });

        setTimeout(() => {
          marker.openPopup();
          this.stopTooltip();

          this.map.eachLayer((layer: any) => {
            if (layer._path) {
              if (layer._path.classList[0] === 'layer-measure-resultarea') {
                layer._path.onclick = () => {
                  marker.openPopup()
                };
                marker.layer = layer;
                this.markerGroup.addLayer(marker);
                // this.map.panTo([bounds.getCenter().lat + 0.01, bounds.getCenter().lng]);
              }
            }
          });
        });
      } else {
        this.stopTooltip();
        this.measureControl._finishMeasure();
      }
    });

    this.map.on('measureclick', (event: any) => {
      if (event.count > 0 && event.count < 3) {
        this.mouseTooltip = 'Desenhe um objeto de no mínimo 3 lados';
      } else if (event.count >= 3) {
        this.mouseTooltip = 'Clique duas vezes para finalizar ou continue desenhando';
      }
    });

    this.initControls();
    });
  }

  zoomTo(id: number) {
    document.getElementById('zoomto-' + id).onclick = () => {
      _.forEach(this.markerGroup.getLayers(), (marker) => {
        if (marker._popup.options.polygonsCount === id) {
          marker.centerToAreaFunction();
        }
      });
    };
  }

  deleteLayer(id: number) {
    document.getElementById('delete-' + id).onclick = () => {
      this.deleteArea = id;
      _.forEach(this.markerGroup.getLayers(), (marker) => {
        if (marker._popup.options.polygonsCount === id) {
          this.deletedLayer = marker;
        }
      });
    };
  }

  onDeleteArea() {
    this.map.removeLayer(this.deletedLayer.layer);
    this.markerGroup.removeLayer(this.deletedLayer);
    this.map.removeLayer(this.deletedLayer);    
    document.getElementById(`layers-container-${this.deletedLayer._popup.options.polygonsCount}`).remove();
    this.deletedLayer = undefined;
    this.polygonsCount--;
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
    L.control.mousePosition({ emptyString: 'Indisponível' }).addTo(this.map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(this.map);

    this.measureControl = L.control.measure({
      position: 'topright',
      primaryAreaUnit: 'sqmeters',
      secondaryAreaUnit: 'hectares',
      activeColor: '#00B9F0',
      completedColor: '#002F66'
    });

    this.measureControl.addTo(this.map);

    L.Control.Legends = L.Control.extend({
      onAdd: (map) => {
        const div = L.DomUtil.create('div', 'info legend');
        // div.onclick = (event) => {
        div.style.height = '100%';
        // }
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

        div.innerHTML = '<div class="inside-legend-container">' + labels.join('') + '</div>';
        return div;
      }
    });

    L.control.legends = (options) => {
      return new L.Control.Legends(options);
    }

    L.control.legends({ position: 'topright' }).addTo(this.map);
  }

  startLayer(features: any, bar: any) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '../../assets/tcc-shapefile.geojson');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = 'json';
    xhr.onload = () => {
      if (xhr.status !== 200) return
      const data = _.cloneDeep(xhr.response);
      _.forEach(data.features, (feature, index) => {
        const foundedProperties = _.find(features, ['ID', feature.properties.mslink.toString()]);
        if (foundedProperties) {
          feature.properties = foundedProperties;
        } else {
          console.log(feature.properties)
          console.log(index)
        }
      });

      L.geoJSON(data, {
        style: (feature) => {
          return {
              weight: 1,
              opacity: 1,
              color: 'white',
              fillOpacity: 0.7,
              fillColor: this.getColor(feature.properties['Sigla'])
          };
        }
      }).addTo(this.map);

      bar.value = 100;
      this.loading = false;
    };
    xhr.send();
  }

  addLayer(layer: any) {
    L.Control.LayersContainer = L.Control.extend({
      onAdd: (map) => {
        const div: any = L.DomUtil.create('div', 'layers-container');
        div.id = 'layers-container-' + layer.polygonsCount
        div.layer = layer;
        div.innerHTML = `<div id="layer-${layer.polygonsCount}" class="layer">
                           <i class="fas fa-layer-group"></i> ${layer.polygonName} ${this.polygonsCount}<span id="area-size-container-${layer.polygonsCount}" class="area-size-container">${layer.areaDisplay}</span>
                         </div>`;
        return div;
      }
    });

    L.control.layersContainer = (options) => {
      return new L.Control.LayersContainer(options);
    }

    L.control.layersContainer({ position: 'topleft' }).addTo(this.map);

    document.getElementById('layer-' + layer.polygonsCount).onclick = (event: any) => {
      const split = event.target.parentNode.id.split('-');
      console.log(split);
      this.markerGroup.eachLayer((marker: any) => {
        if (marker._popup.options.polygonsCount === parseInt(split[split.length - 1])) {
          setTimeout(() => {
            marker.openPopup();
            marker.centerToAreaFunction();
          });
        }
      });
    };
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
  }

  getKey(key: string) {
    switch (key) {
      case 'mslink':
        return 'ID';
      case 'cd_zon':
        return 'Código da Zona';
      case 'tp_zon':
        return 'Tipo';
      case 'nm_zon':
        return 'Sigla';
      case 'nome':
        return 'Nome';
      case 'macroRegiao':
        return 'Macro Região';
      case 'residenciasUnifamiliares':
        return 'Residencias Unifamiliares';
      case 'condominiosResidenciaisUnifamiliares':
        return 'Condomínios Residenciais Unifamiliares';
      case 'condominiosResidenciaisMultifamiliares':
        return 'Condomínios Residenciais Multifamiliares';
      case 'condominiosSalasComerciais':
        return 'Condomínios Salas Comerciais';
      case 'numeroMaxPavimentosComTDC':
        return 'Número Max. de Pavimentos com TDC';
      case 'taxaOcupacaoMax':
        return 'Taxa de Ocupação Max.';
      case 'taxaImpermeabilizacaoMax':
        return 'Taxa de Impermeabilização Max.';
      case 'alturaMaxFachadaEateCumeeira':
        return 'Altura Max. da Fachada/até Cumeeira';
      case 'coeficienteAproveitamentoMax':
        return 'Coeficiente de Aproveitamento Max.';
      case 'areaMinima':
        return 'Área Mínima';
      case 'testadaMinima':
        return 'Testada Mínima';
      case 'densidadeLiquida':
        return 'Densidade Líquida';
      case 'observacoes':
        return 'Observações';
      case 'preRequisitos':
        return 'Pré requisitos';
    }
  }

}
