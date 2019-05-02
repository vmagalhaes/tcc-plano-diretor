import { Component, OnInit, ElementRef } from '@angular/core';

import * as L from 'leaflet';
import 'leaflet-mouse-position';

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

  constructor() { }

  ngOnInit() {
    this.map = L.map(document.getElementById('map'), this.options);

    this.map.zoomControl.setPosition('bottomright');
    L.control.mousePosition().addTo(this.map);
    L.control.scale({ position: 'bottomleft' }).addTo(this.map);
  }

}
