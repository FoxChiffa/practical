const PREFIX = "http://localhost:10000/";

const req = (url, options = {}) => {
  const { body } = options;
  return fetch((PREFIX + url).replace(/\/\/$/, ""), {
    ...options,
    body: body ? JSON.stringify(body) : null,
    headers: {
      ...options.headers,
      ...(body
        ? {
            "Content-Type": "application/json",
          }
        : null),
      },
      credentials: 'include'
  }).then((res) =>
    res.ok
      ? res.json()
      : res.text().then((message) => {
          throw new Error(message);
        })
  );
};

export const getNotes = async ({ age, search, page } = {}) => {
  return req(`node?age=${age}&search=${search}&page=${page}`);
};

export const createNote = (title, text) => {
  return req('node', {method:'POST', body: {title, text}});
};

export const getNote = async (_id) => {
  const id = await _id;
  return req(`node?id=${id}`);
};

export const archiveNote  = async (_id) => {
  const id = await _id;
  return req('node', {method:'PATCH', body: {id, isArchived:true}});
};

export const unarchiveNote  = async (_id) => {
  const id = await _id;
  return req('node', {method:'PATCH', body: {id, isArchived:false}});
};

export const editNote = async (id, title, text) => {
  return req('node', {method:'PATCH', body: {id, title, text}});
};

export const deleteNote = async (id) => {
  return req('node', {method:'DELETE', body: {id}});
};





export const deleteAllArchived = () => {
  return req('node', {method:'DELETE', body: {isArchived: 'all'}});
};

export const notePdfUrl = () => {};
