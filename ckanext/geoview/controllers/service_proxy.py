# -*- coding: utf-8 -*-

import logging

import ckan.lib.base as base

import ckanext.geoview.utils as utils


log = logging.getLogger(__name__)


class ServiceProxyController(base.BaseController):
    def proxy_service(self, resource_id):
        data_dict = {"resource_id": resource_id}
        context = {
            "model": base.model,
            "session": base.model.Session,
            "user": base.c.user or base.c.author,
        }
        return utils.proxy_service_resource(
            self._py_object.request, context, data_dict
        )

    def proxy_service_url(self, map_id):
        url = base.config.get("ckanext.spatial.common_map." + map_id + ".url")
        return utils.proxy_service_url(self._py_object.request, url)
