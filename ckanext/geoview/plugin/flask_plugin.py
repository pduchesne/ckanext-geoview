# -*- coding: utf-8 -*-

from ckan import plugins as p

from ckanext.geoview.views import get_blueprints


class GeoViewMixin(p.SingletonPlugin):
    p.implements(p.IBlueprint)

    # IBlueprint

    def get_blueprint(self):
        return get_blueprints()
