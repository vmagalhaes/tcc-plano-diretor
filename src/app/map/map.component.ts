import { Component, OnInit, ElementRef } from '@angular/core';

import * as L from 'leaflet';
import 'leaflet-mouse-position';
import 'src/assets/js/leaflet-measure.pt_BR';

declare var UIkit: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  map: L.Map;

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
  polygonsList: any[] = [];

  constructor() { }

  ngOnInit() {
    this.map = L.map(document.getElementById('map'), this.options);

    this.map.on('measurestart', () => {
      this.mouseTooltip = 'Clique no mapa para iniciar';
    });

    this.map.on('measurefinish', (event) => {
      this.polygonsList.push(event);
      // this.measureControl._startMeasure();      
      this.measureControl.options.polygonName = 'Polígono ' + this.polygonsList.length;
    });

    this.map.on('measureclick', (event: any) => {
      if (event.count > 0 && event.count < 3) {
        this.mouseTooltip = 'Desenhe o polígono';
      } else if (event.count >= 3) {
        this.mouseTooltip = 'Clique duas vezes para finalizar ou continue';
      }
    });

    document.getElementById('map').onmousemove = (event) => {
      document.getElementById('tooltip').setAttribute('style', `left: ${event.pageX + 10}px; top: ${event.pageY}px`);
    }

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
    this.measureControl._startMeasure();
  }

}
