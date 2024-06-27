import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { generateClient } from 'aws-amplify/api';
import {
  Button,
  Flex,
  Heading,
  Image,
  Text,
  TextField,
  View,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import { listNotes } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
} from "./graphql/mutations";
import { uploadData, getUrl, remove } from 'aws-amplify/storage';
const path = 'public/photos/';

const App = ({ signOut }) => {
  const [notes, setNotes] = useState([]);
  const client = generateClient();
  console.log('Component rendered');
  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await client.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(
      notesFromAPI.map(async (note) => {
        if (note.image) {
          const path = `public/album/2024/${note.image}`;
          try{
            const url = await getUrl({ path });
            note.image = url.url;
            console.log(`Image URL for ${path}`, url.url);
          } catch (error) {
            console.error('Error fetching image:', error);
            note.image = null;
          }
        }
        return note;
      })
    );
    setNotes(notesFromAPI);
  }

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const image = form.get("image");
    const data = {
      name: form.get("name"),
      description: form.get("description"),
      image: image ? image.name : null,
    };
    if (data.image){
      const path = `public/album/2024/${data.image}`;
      try{
        await uploadData({ path, image });
        console.log(`Image uploaded to ${path}`);
      } catch(error){
        console.error('Error adding image:', error);
      }
    }
    await client.graphql({
      query: createNoteMutation,
      variables: { input: data },
    });
    fetchNotes();
    event.target.reset();
  }

  async function deleteNote({ id, image }) {
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    if ( image ){
      const path = `public/album/2024/${image}`;
      try{
        await remove({ path });
        console.log(`Image removed from ${path}`);
      } catch(error){
        console.error('Error removing image:', error);
      }
    }
    await client.graphql({
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }

  return (
    <View className="App">
      <Heading level={1}>My Notes App</Heading>
      <View as="form" margin="3rem 0" onSubmit={createNote}>
        <Flex direction="row" justifyContent="center">
          <TextField
            name="name"
            placeholder="Note Name"
            label="Note Name"
            labelHidden
            variation="quiet"
            required
          />
          <TextField
            name="description"
            placeholder="Note Description"
            label="Note Description"
            labelHidden
            variation="quiet"
            required
          />
          <Button type="submit" variation="primary">
            Create Note
          </Button>
        </Flex>
      </View>
      <View
        name="image"
        as="input"
        type="file"
        style={{ alignSelf: "end" }}
      />
      <Heading level={2}>Current Notes</Heading>
      <View margin="3rem 0">
        {notes.map((note) => (
          <Flex
            key={note.id || note.name}
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <Text as="strong" fontWeight={700}>
              {note.name}
            </Text>
            <Text as="span">{note.description}</Text>
            {note.image && (
              <Image
                src={note.image}
                alt={'visual aid for ${notes.name}'}
                style={{ width: 400 }}
              />
            )}
            <Button variation="link" onClick={() => deleteNote(note)}>
              Delete note
            </Button>
          </Flex>
        ))}
      </View>
      <Button onClick={signOut}>Sign Out</Button>
    </View>
  );
};

export default withAuthenticator(App);