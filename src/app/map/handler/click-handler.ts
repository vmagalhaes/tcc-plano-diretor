import { Subject } from 'rxjs';

export class ClickHandler {

  mapClickSource: Subject<any> = new Subject<any>();
  mapClick$ = this.mapClickSource.asObservable();

  handler = L.Handler.extend({
    addHooks: function () {
      const context: ClickHandler = this.context;

      this.onClick = function (event: any) {
        context.mapClickSource.next(event);
      };

      context.map.on('click', this.onClick);
    },
    removeHooks: function () {
      this.context.map.off('click', this.onClick);
    }
  });

  constructor(private map: L.Map) {
    this.map.addHandler('clickHandler', this.handler);
    (<any>this.map).clickHandler.context = this;
  }

  enable() {
    (<any>this.map).clickHandler.enable();
  }

  disable() {
    (<any>this.map).clickHandler.disable();
  }

}
